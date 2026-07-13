import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { UserEntity } from '../users/entities/user.entity';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import { CouponRedemptionEntity } from '../coupons/entities/coupon-redemption.entity';
import { UserRoleEnum } from '../database/database.enums';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let redemptionRepository: any;
  let dataSource: any;
  let passwordService: any;
  let jwtService: any;

  const mockUser: UserEntity = {
    userId: 'user-uuid-1',
    firstNames: 'Ana',
    lastNames: 'Lopez',
    email: 'ana@test.com',
    phone: '987654321',
    password: 'hashed-password:salt',
    role: UserRoleEnum.CLIENTE,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    wallet: {
      walletId: 'wallet-uuid-1',
      userId: 'user-uuid-1',
      availablePoints: 0,
      totalPoints: 0,
      user: null as any,
    } as WalletEntity,
  };

  function createMockUser(overrides?: Partial<UserEntity>): UserEntity {
    return { ...mockUser, ...overrides, wallet: { ...mockUser.wallet, ...(overrides?.wallet || {}) } as WalletEntity };
  }

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    redemptionRepository = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      save: jest.fn(),
    };

    passwordService = {
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    };

    const mockEntityManager = {
      create: jest.fn(),
      save: jest.fn(),
      getRepository: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb: any) => {
        const createdUser = {
          ...mockUser,
          userId: 'new-user-uuid',
          email: 'ana@test.com',
        };
        mockEntityManager.create.mockReturnValue(createdUser);
        mockEntityManager.save.mockResolvedValue(createdUser);
        mockEntityManager.getRepository.mockReturnValue(mockEntityManager);
        return cb(mockEntityManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        { provide: getRepositoryToken(CouponRedemptionEntity), useValue: redemptionRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: PasswordService, useValue: passwordService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('CN-01: Registro de usuario con datos validos (Cliente)', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);
      passwordService.hashPassword.mockResolvedValue('hashed-pass:salt');

      const response = await service.register({
        firstNames: 'Ana',
        lastNames: 'Lopez',
        email: '  Ana@test.com  ',
        phone: '987654321 ',
        password: 'password123',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'ana@test.com' },
        select: { userId: true },
      });
      expect(response).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(response).toHaveProperty('user');
      expect(response.user.email).toBe('ana@test.com');
      expect(response.user.role).toBe(UserRoleEnum.CLIENTE);
    });

    it('CN-02: Registro con correo ya existente lanza ConflictException', async () => {
      userRepository.findOne.mockResolvedValue({ userId: 'existing-id' });

      await expect(
        service.register({
          firstNames: 'Ana',
          lastNames: 'Lopez',
          email: 'ana@test.com',
          phone: '987654321',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe normalizar email (trim + lowerCase) al registrar', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);
      passwordService.hashPassword.mockResolvedValue('hashed-pass:salt');

      await service.register({
        firstNames: 'Ana',
        lastNames: 'Lopez',
        email: '  Ana@TEST.com  ',
        phone: '987654321',
        password: 'password123',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'ana@test.com' },
        select: { userId: true },
      });
    });

    it('debe crear billetera cuando el rol tiene wallet (Cliente)', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);
      passwordService.hashPassword.mockResolvedValue('hashed-pass:salt');

      const response = await service.register({
        firstNames: 'Ana',
        lastNames: 'Lopez',
        email: 'ana@test.com',
        phone: '987654321',
        password: 'password123',
      });

      expect(response).toHaveProperty('wallet');
      expect(response.wallet).not.toBeNull();
    });

    it('debe manejar violacion de unicidad durante la transaccion', async () => {
      userRepository.findOne.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-pass:salt');

      dataSource.transaction.mockRejectedValueOnce({ code: '23505' });

      await expect(
        service.register({
          firstNames: 'Ana',
          lastNames: 'Lopez',
          email: 'ana@test.com',
          phone: '987654321',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('CN-05: Login con credenciales correctas devuelve accessToken y datos', async () => {
      const user = createMockUser();
      userRepository.findOne.mockResolvedValue(user);
      passwordService.verifyPassword.mockResolvedValue(true);
      redemptionRepository.count.mockResolvedValue(5);

      const response = await service.login({
        email: '  ana@test.com  ',
        password: 'password123',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'ana@test.com' },
        relations: { wallet: true },
      });
      expect(response).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(response).toHaveProperty('user');
      expect(response.user.email).toBe('ana@test.com');
      expect(response.wallet).not.toBeNull();
      if (response.wallet) {
        expect(response.wallet.redeemedCount).toBe(5);
      }
    });

    it('CN-06: Login con contrasena incorrecta lanza UnauthorizedException', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      passwordService.verifyPassword.mockResolvedValue(false);

      await expect(
        service.login({ email: 'ana@test.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si el correo no existe', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noexiste@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('debe devolver perfil y wallet del usuario autenticado', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      redemptionRepository.count.mockResolvedValue(3);

      const profile = await service.getProfile('user-uuid-1');

      expect(profile).toHaveProperty('user');
      expect(profile.user.id).toBe('user-uuid-1');
      expect(profile).toHaveProperty('wallet');
      expect(profile.wallet).not.toBeNull();
      if (profile.wallet) {
        expect(profile.wallet.redeemedCount).toBe(3);
      }
    });
  });
});
