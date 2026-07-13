import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';
import { UserRoleEnum } from '../database/database.enums';
import { WalletEntity } from '../wallet/entities/wallet.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: any;

  function createMockUser(overrides?: Partial<UserEntity>): UserEntity {
    return {
      userId: 'user-1',
      firstNames: 'Juan',
      lastNames: 'Perez',
      email: 'juan@test.com',
      phone: '987654321',
      password: 'hash',
      role: UserRoleEnum.CLIENTE,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      wallet: {
        walletId: 'wallet-1',
        userId: 'user-1',
        availablePoints: 100,
        totalPoints: 200,
        user: null as any,
      } as WalletEntity,
      ...overrides,
    };
  }

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getProfile', () => {
    it('devuelve el perfil del usuario con wallet', async () => {
      const user = createMockUser();
      userRepository.findOne.mockResolvedValue(user);

      const profile = await service.getProfile('user-1');

      expect(profile.user.id).toBe('user-1');
      expect(profile.user.firstNames).toBe('Juan');
      expect(profile.user.email).toBe('juan@test.com');
      expect(profile.wallet).not.toBeNull();
      if (profile.wallet) {
        expect(profile.wallet.walletId).toBe('wallet-1');
      }
    });

    it('devuelve wallet null si el rol no tiene billetera', async () => {
      const user = createMockUser({
        role: UserRoleEnum.ADMINISTRADOR,
      });
      userRepository.findOne.mockResolvedValue(user);

      const profile = await service.getProfile('user-1');

      expect(profile.wallet).toBeNull();
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile('user-999')).rejects.toThrow(NotFoundException);
    });

    it('devuelve wallet null si el usuario no tiene relacion wallet', async () => {
      const user = createMockUser();
      delete (user as any).wallet;
      userRepository.findOne.mockResolvedValue(user);

      const profile = await service.getProfile('user-1');

      expect(profile.wallet).toBeNull();
    });
  });

  describe('getWeeklyRanking', () => {
    it('devuelve el ranking semanal con los datos mapeados', async () => {
      const mockRanking = [
        {
          userId: 'user-1',
          firstNames: 'Juan',
          lastNames: 'Perez',
          total_records: '10',
          validated_records: '8',
          pending_records: '2',
          total_weight_kg: '25.50',
          total_points: '255',
        },
        {
          userId: 'user-2',
          firstNames: 'Ana',
          lastNames: 'Lopez',
          total_records: '5',
          validated_records: '5',
          pending_records: '0',
          total_weight_kg: '12.00',
          total_points: '120',
        },
      ];

      const queryBuilder: any = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockRanking),
      };

      userRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getWeeklyRanking('user-1');

      expect(result.period).toHaveProperty('startAt');
      expect(result.period).toHaveProperty('endAt');
      expect(result.ranking).toHaveLength(2);
      expect(result.ranking[0].rank).toBe(1);
      expect(result.ranking[0].isCurrentUser).toBe(true);
      expect(result.ranking[1].isCurrentUser).toBe(false);
    });
  });
});
