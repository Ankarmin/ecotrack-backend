import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { WalletEntity } from './entities/wallet.entity';
import { CouponEntity } from '../coupons/entities/coupon.entity';
import { CouponRedemptionEntity } from '../coupons/entities/coupon-redemption.entity';
import { CouponRedemptionStatusEnum, WalletMovementTypeEnum } from '../database/database.enums';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: any;
  let couponRepository: any;
  let redemptionRepository: any;
  let dataSource: any;

  let mockEntityManager: any;

  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const today = new Date();

  function createMockCoupon(overrides?: Partial<CouponEntity>): CouponEntity {
    return {
      couponId: 'coupon-uuid-1',
      title: 'Cupon de prueba',
      description: 'Descripcion',
      requiredPoints: 100,
      stock: 10,
      validityDays: 30,
      isActive: true,
      createdAt: today,
      updatedAt: today,
      ...overrides,
    };
  }

  function createMockWallet(overrides?: Partial<WalletEntity>): WalletEntity {
    return {
      walletId: 'wallet-uuid-1',
      userId: 'user-uuid-1',
      availablePoints: 500,
      totalPoints: 500,
      user: null as any,
      ...overrides,
    };
  }

  function createMockRedemption(overrides?: Partial<CouponRedemptionEntity>): CouponRedemptionEntity {
    return {
      couponRedemptionId: 'redemption-uuid-1',
      userId: 'user-uuid-1',
      couponId: 'coupon-uuid-1',
      usedPoints: 100,
      redemptionCode: 'code-abc',
      status: CouponRedemptionStatusEnum.CANJEADO,
      redeemedAt: new Date(),
      expiresAt: futureDate,
      coupon: createMockCoupon(),
      ...overrides,
    };
  }

  beforeEach(async () => {
    walletRepository = {
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    couponRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    redemptionRepository = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockEntityManager = {};

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(WalletEntity), useValue: walletRepository },
        { provide: getRepositoryToken(CouponEntity), useValue: couponRepository },
        { provide: getRepositoryToken(CouponRedemptionEntity), useValue: redemptionRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  describe('redeemCoupon', () => {
    function setupTransactionMocks(overrides: {
      coupon?: CouponEntity | null;
      wallet?: WalletEntity | null;
    }) {
      const txn: any = {};

      txn.getRepository = jest.fn((entityClass: any) => {
        if (entityClass === CouponEntity) {
          return {
            findOne: jest.fn().mockResolvedValue(overrides.coupon),
            save: jest.fn().mockImplementation((c: any) => Promise.resolve(c)),
          };
        }
        if (entityClass === WalletEntity) {
          return {
            findOne: jest.fn().mockResolvedValue(overrides.wallet),
            save: jest.fn().mockImplementation((w: any) => Promise.resolve(w)),
          };
        }
        if (entityClass === CouponRedemptionEntity) {
          return {
            create: jest.fn().mockImplementation((data: any) => ({
              couponRedemptionId: 'redemption-new',
              ...data,
              redeemedAt: new Date(),
            })),
            save: jest.fn().mockImplementation((r: any) =>
              Promise.resolve({
                couponRedemptionId: 'redemption-new',
                userId: r.userId || 'user-uuid-1',
                couponId: r.couponId,
                usedPoints: r.usedPoints,
                redemptionCode: r.redemptionCode || 'mock-code',
                status: r.status,
                redeemedAt: new Date(),
                expiresAt: r.expiresAt || futureDate,
              }),
            ),
          };
        }
        if (entityClass === require('../wallet/entities/wallet-movement.entity').WalletMovementEntity) {
          return {
            create: jest.fn().mockImplementation((data: any) => data),
            save: jest.fn().mockImplementation((m: any) =>
              Promise.resolve({ ...m, walletMovementId: 'movement-new' }),
            ),
          };
        }
        if (
          entityClass ===
          require('../wallet/entities/wallet-movement-detail.entity')
            .WalletMovementDetailEntity
        ) {
          return {
            create: jest.fn().mockImplementation((data: any) => data),
            save: jest.fn().mockResolvedValue({}),
          };
        }
        return {};
      });

      dataSource.transaction.mockImplementation(async (cb: any) => cb(txn));
    }

    it('CB-01: rechaza canje cuando availablePoints < requiredPoints', async () => {
      const coupon = createMockCoupon({ requiredPoints: 1000 });
      const wallet = createMockWallet({ availablePoints: 100 });
      setupTransactionMocks({ coupon, wallet });

      await expect(service.redeemCoupon('user-uuid-1', 'coupon-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('CB-02: rechaza canje cuando cupon sin stock (stock <= 0)', async () => {
      const coupon = createMockCoupon({ stock: 0 });
      const wallet = createMockWallet({ availablePoints: 500 });
      setupTransactionMocks({ coupon, wallet });

      await expect(service.redeemCoupon('user-uuid-1', 'coupon-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('CB-03: rechaza canje cuando el cupon expiro', async () => {
      const coupon = createMockCoupon({
        stock: 10,
        requiredPoints: 100,
        validityDays: 30,
        createdAt: new Date('2020-01-01'),
      });
      const wallet = createMockWallet({ availablePoints: 500 });
      setupTransactionMocks({ coupon, wallet });

      await expect(service.redeemCoupon('user-uuid-1', 'coupon-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('CB-04: canje valido decrementa saldo y stock, y crea redemption + movimiento', async () => {
      const coupon = createMockCoupon({ requiredPoints: 100, stock: 5 });
      const wallet = createMockWallet({ availablePoints: 500 });
      setupTransactionMocks({ coupon, wallet });

      const txn: any = {};
      const couponRepo = {
        findOne: jest.fn().mockResolvedValue(coupon),
        save: jest.fn().mockImplementation((c: any) => Promise.resolve(c)),
      };
      const walletRepo = {
        findOne: jest.fn().mockResolvedValue(wallet),
        save: jest.fn().mockImplementation((w: any) => Promise.resolve(w)),
      };
      const redemptionRepo = {
        create: jest.fn().mockImplementation((d: any) => ({ ...d, couponRedemptionId: 'red-1', redeemedAt: new Date(), expiresAt: futureDate })),
        save: jest.fn().mockImplementation((r: any) => Promise.resolve({ ...r, couponRedemptionId: 'red-1', redeemedAt: new Date(), expiresAt: futureDate })),
        count: jest.fn().mockResolvedValue(1),
      };
      const movementRepo = {
        create: jest.fn().mockImplementation((d: any) => d),
        save: jest.fn().mockImplementation((m: any) => Promise.resolve({ ...m, walletMovementId: 'mov-1' })),
      };
      const detailRepo = {
        create: jest.fn().mockImplementation((d: any) => d),
        save: jest.fn().mockResolvedValue({}),
      };

      txn.getRepository = jest.fn((entityClass: any) => {
        if (entityClass === CouponEntity) return couponRepo;
        if (entityClass === WalletEntity) return walletRepo;
        if (entityClass === CouponRedemptionEntity) return redemptionRepo;
        if (entityClass === require('../wallet/entities/wallet-movement.entity').WalletMovementEntity) return movementRepo;
        if (entityClass === require('../wallet/entities/wallet-movement-detail.entity').WalletMovementDetailEntity) return detailRepo;
        return {};
      });

      dataSource.transaction.mockImplementation(async (cb: any) => cb(txn));

      const result = await service.redeemCoupon('user-uuid-1', 'coupon-uuid-1');

      expect(result.message).toBe('Canje realizado correctamente');
      expect(result.wallet.availablePoints).toBe(400);
      expect(result).toHaveProperty('redemption');
    });

    it('lanza NotFoundException si el cupon no existe', async () => {
      setupTransactionMocks({ coupon: null, wallet: null });

      await expect(service.redeemCoupon('user-uuid-1', 'coupon-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ConflictException si el cupon esta inactivo', async () => {
      const coupon = createMockCoupon({ isActive: false });
      const wallet = createMockWallet();
      setupTransactionMocks({ coupon, wallet });

      await expect(service.redeemCoupon('user-uuid-1', 'coupon-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('R-03: condicion de carrera - solo un canje exitoso con stock=1', async () => {
      const coupon = createMockCoupon({ requiredPoints: 100, stock: 1 });
      const wallet = createMockWallet({ availablePoints: 500 });

      const txn: any = {};
      const couponRepo = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce({ ...coupon })
          .mockResolvedValueOnce({ ...coupon, stock: 0 }),
        save: jest.fn().mockImplementation((c: any) => Promise.resolve(c)),
      };
      const walletRepo = {
        findOne: jest.fn().mockResolvedValue(wallet),
        save: jest.fn().mockImplementation((w: any) => Promise.resolve(w)),
      };
      const redemptionRepo = {
        create: jest.fn().mockImplementation((d: any) => ({ couponRedemptionId: 'red-1', ...d, redeemedAt: new Date(), expiresAt: futureDate })),
        save: jest.fn().mockImplementation((r: any) => Promise.resolve({ couponRedemptionId: 'red-1', ...r, redeemedAt: new Date(), expiresAt: futureDate })),
        count: jest.fn().mockResolvedValue(1),
      };
      const movementRepo = {
        create: jest.fn().mockImplementation((d: any) => d),
        save: jest.fn().mockImplementation((m: any) => Promise.resolve({ ...m, walletMovementId: 'mov-1' })),
      };
      const detailRepo = {
        create: jest.fn().mockImplementation((d: any) => d),
        save: jest.fn().mockResolvedValue({}),
      };

      txn.getRepository = jest.fn((entityClass: any) => {
        if (entityClass === CouponEntity) return couponRepo;
        if (entityClass === WalletEntity) return walletRepo;
        if (entityClass === CouponRedemptionEntity) return redemptionRepo;
        if (entityClass === require('../wallet/entities/wallet-movement.entity').WalletMovementEntity) return movementRepo;
        if (entityClass === require('../wallet/entities/wallet-movement-detail.entity').WalletMovementDetailEntity) return detailRepo;
        return {};
      });

      dataSource.transaction.mockImplementation(async (cb: any) => cb(txn));

      const result = await service.redeemCoupon('user-uuid-1', 'coupon-uuid-1');
      expect(result.message).toBe('Canje realizado correctamente');

      await expect(service.redeemCoupon('user-uuid-1', 'coupon-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getWallet', () => {
    it('devuelve wallet, cupones y redemptions del usuario', async () => {
      walletRepository.findOneBy.mockResolvedValue(createMockWallet());
      couponRepository.find.mockResolvedValue([createMockCoupon()]);
      redemptionRepository.find.mockResolvedValue([createMockRedemption()]);
      redemptionRepository.count.mockResolvedValue(1);

      const result = await service.getWallet('user-uuid-1');

      expect(result).toHaveProperty('wallet');
      expect(result).toHaveProperty('coupons');
      expect(result).toHaveProperty('recentRedemptions');
      expect(result.coupons).toHaveLength(1);
      expect(result.recentRedemptions).toHaveLength(1);
    });
  });
});
