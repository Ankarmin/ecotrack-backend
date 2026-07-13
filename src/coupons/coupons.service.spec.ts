import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Test, TestingModule } from '@nestjs/testing';
import { CouponsService } from './coupons.service';
import { CouponEntity } from './entities/coupon.entity';

describe('CouponsService', () => {
  let service: CouponsService;
  let couponRepository: any;

  const today = new Date();

  function createMockCoupon(overrides?: Partial<CouponEntity>): CouponEntity {
    return {
      couponId: 'coupon-1',
      title: 'Descuento 20%',
      description: 'Cupon de prueba',
      requiredPoints: 100,
      stock: 10,
      validityDays: 30,
      isActive: true,
      createdAt: today,
      updatedAt: today,
      ...overrides,
    };
  }

  beforeEach(async () => {
    couponRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: getRepositoryToken(CouponEntity), useValue: couponRepository },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
  });

  describe('findAll', () => {
    it('devuelve la lista de cupones activos', async () => {
      const mockCoupons = [
        createMockCoupon({ couponId: 'coupon-1', title: 'Cupon A' }),
        createMockCoupon({ couponId: 'coupon-2', title: 'Cupon B' }),
      ];
      couponRepository.find.mockResolvedValue(mockCoupons);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('status');
    });

    it('CN-07 (logica): create con requiredPoints valido guarda correctamente', async () => {
      const dto = {
        title: 'Cupon Nuevo',
        description: 'Desc',
        requiredPoints: 100,
        stock: 5,
        validityDays: 30,
        isActive: true,
      };

      const saved = createMockCoupon({
        couponId: 'coupon-new',
        title: 'Cupon Nuevo',
        requiredPoints: 100,
      });
      couponRepository.create.mockReturnValue(saved);
      couponRepository.save.mockResolvedValue(saved);

      const result = await service.create(dto);
      expect(result.title).toBe('Cupon Nuevo');
      expect(result.requiredPoints).toBe(100);
    });

    it('CN-08 (logica): create con title vacio', async () => {
      const dto = {
        title: '  ',
        description: null,
        requiredPoints: 50,
        stock: 10,
        validityDays: 30,
        isActive: true,
      };

      const saved = createMockCoupon({
        couponId: 'coupon-new',
        title: '',
        requiredPoints: 50,
      });
      couponRepository.create.mockReturnValue(saved);
      couponRepository.save.mockResolvedValue(saved);

      const result = await service.create(dto);
      expect(result.title).toBe('');
      expect(result.requiredPoints).toBe(50);
    });

    it('create aplica valores por defecto (validityDays=30, isActive=true)', async () => {
      const saved = createMockCoupon({ couponId: 'coupon-new', validityDays: 30, isActive: true });
      couponRepository.create.mockReturnValue(saved);
      couponRepository.save.mockResolvedValue(saved);

      await service.create({
        title: 'Cupon',
        requiredPoints: 50,
        stock: 10,
      } as any);

      expect(couponRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          validityDays: 30,
          isActive: true,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el cupon no existe', async () => {
      couponRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('coupon-999')).rejects.toThrow(NotFoundException);
    });

    it('devuelve el cupon mapeado si existe', async () => {
      couponRepository.findOneBy.mockResolvedValue(createMockCoupon());

      const result = await service.findOne('coupon-1');
      expect(result).toHaveProperty('id');
      expect(result.title).toBe('Descuento 20%');
    });
  });

  describe('isCouponExpired (via status)', () => {
    it('un cupon con fecha de expiracion pasada muestra estado Expirado', async () => {
      const expiredCoupon = createMockCoupon({
        validityDays: 30,
        createdAt: new Date('2020-01-01'),
      });
      couponRepository.findOneBy.mockResolvedValue(expiredCoupon);

      const result = await service.findOne('coupon-1');
      expect(result.status).toBe('Expirado');
    });

    it('un cupon sin stock muestra estado Usado', async () => {
      const usedCoupon = createMockCoupon({ stock: 0 });
      couponRepository.findOneBy.mockResolvedValue(usedCoupon);

      const result = await service.findOne('coupon-1');
      expect(result.status).toBe('Usado');
    });

    it('un cupon inactivo muestra estado Inactivo', async () => {
      const inactiveCoupon = createMockCoupon({ isActive: false });
      couponRepository.findOneBy.mockResolvedValue(inactiveCoupon);

      const result = await service.findOne('coupon-1');
      expect(result.status).toBe('Inactivo');
    });
  });
});
