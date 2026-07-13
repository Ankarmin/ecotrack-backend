import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Test, TestingModule } from '@nestjs/testing';
import { RecyclingRecordsService } from './recycling-records.service';
import { RecyclingRecordEntity } from './entities/recycling-record.entity';
import { MaterialEntity } from '../materials/entities/material.entity';
import { RecyclingCenterEntity } from '../recycling-centers/entities/recycling-center.entity';
import { UserRecyclingCenterEntity } from '../recycling-centers/entities/user-recycling-center.entity';
import { UserEntity } from '../users/entities/user.entity';
import {
  RecyclingRecordStatusEnum,
  UserRoleEnum,
  WalletMovementTypeEnum,
} from '../database/database.enums';
import { AuthenticatedUser } from '../auth/auth.types';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import { WalletMovementEntity } from '../wallet/entities/wallet-movement.entity';
import { WalletMovementDetailEntity } from '../wallet/entities/wallet-movement-detail.entity';
import { RecyclingValidationEntity } from './entities/recycling-validation.entity';

describe('RecyclingRecordsService', () => {
  let service: RecyclingRecordsService;
  let recyclingRecordRepository: any;
  let materialRepository: any;
  let recyclingCenterRepository: any;
  let userRecyclingCenterRepository: any;
  let userRepository: any;
  let dataSource: any;

  const clientUser: AuthenticatedUser = {
    userId: 'client-1',
    email: 'client@test.com',
    role: UserRoleEnum.CLIENTE,
  };

  const validatorUser: AuthenticatedUser = {
    userId: 'validator-1',
    email: 'validator@test.com',
    role: UserRoleEnum.VALIDADOR,
  };

  const adminUser: AuthenticatedUser = {
    userId: 'admin-1',
    email: 'admin@test.com',
    role: UserRoleEnum.ADMINISTRADOR,
  };

  function createMockMaterial(overrides?: Partial<MaterialEntity>): MaterialEntity {
    return {
      materialId: 'material-1',
      name: 'Plastico',
      co2PerKg: '2.5',
      pointsPerKg: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      recyclingRecords: [],
      ...overrides,
    };
  }

  function createMockCenter(overrides?: Partial<RecyclingCenterEntity>): RecyclingCenterEntity {
    return {
      recyclingCenterId: 'center-1',
      name: 'Centro A',
      address: 'Calle 123',
      phone: '123456789',
      isActive: true,
      openingHours: '08:00-18:00',
      createdBy: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      recyclingRecords: [],
      validators: [],
      ...overrides,
    } as any;
  }

  function createMockRecord(overrides?: Partial<RecyclingRecordEntity>): RecyclingRecordEntity {
    return {
      recyclingRecordId: 'record-1',
      userId: 'client-1',
      materialId: 'material-1',
      recyclingCenterId: 'center-1',
      weightKg: '2.50',
      savedCo2: '6.25',
      earnedPoints: 25,
      qrCode: 'QR-UNIQUE-001',
      status: RecyclingRecordStatusEnum.PENDIENTE,
      createdAt: new Date(),
      user: null as any,
      material: createMockMaterial(),
      recyclingCenter: createMockCenter(),
      validation: null as any,
      ...overrides,
    } as any;
  }

  beforeEach(async () => {
    recyclingRecordRepository = {
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    materialRepository = {
      findOneBy: jest.fn(),
    };

    recyclingCenterRepository = {
      findOneBy: jest.fn(),
    };

    userRecyclingCenterRepository = {
      findOne: jest.fn(),
    };

    userRepository = {
      findOneBy: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecyclingRecordsService,
        { provide: getRepositoryToken(RecyclingRecordEntity), useValue: recyclingRecordRepository },
        { provide: getRepositoryToken(MaterialEntity), useValue: materialRepository },
        { provide: getRepositoryToken(RecyclingCenterEntity), useValue: recyclingCenterRepository },
        { provide: getRepositoryToken(UserRecyclingCenterEntity), useValue: userRecyclingCenterRepository },
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<RecyclingRecordsService>(RecyclingRecordsService);
  });

  describe('create', () => {
    it('CB-05: rechaza creacion si el QR ya fue registrado', async () => {
      materialRepository.findOneBy.mockResolvedValue(createMockMaterial());
      recyclingCenterRepository.findOneBy.mockResolvedValue(createMockCenter());
      recyclingRecordRepository.findOneBy.mockResolvedValue({ recyclingRecordId: 'existing' });

      await expect(
        service.create(clientUser, {
          materialId: 'material-1',
          recyclingCenterId: 'center-1',
          weightKg: 2.5,
          qrCode: 'QR-UNIQUE-001',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('CB-06: calcula correctamente earnedPoints y savedCo2', async () => {
      materialRepository.findOneBy.mockResolvedValue(createMockMaterial());
      recyclingCenterRepository.findOneBy.mockResolvedValue(createMockCenter());
      recyclingRecordRepository.findOneBy.mockResolvedValue(null);
      const savedRecord = createMockRecord();
      recyclingRecordRepository.create.mockReturnValue(savedRecord);
      recyclingRecordRepository.save.mockResolvedValue(savedRecord);

      const result = await service.create(clientUser, {
        materialId: 'material-1',
        recyclingCenterId: 'center-1',
        weightKg: 2.5,
        qrCode: 'QR-NEW-002',
      });

      expect(result.earnedPoints).toBe(25);
      expect(result.savedCo2).toBe(6.25);
    });

    it('R-04: rechaza creacion si el usuario no es Cliente', async () => {
      await expect(
        service.create(validatorUser, {
          materialId: 'material-1',
          recyclingCenterId: 'center-1',
          weightKg: 2.5,
          qrCode: 'QR-NEW-003',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el material no existe o esta inactivo', async () => {
      materialRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.create(clientUser, {
          materialId: 'material-999',
          recyclingCenterId: 'center-1',
          weightKg: 2.5,
          qrCode: 'QR-NEW-004',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFoundException si el centro no existe o esta inactivo', async () => {
      materialRepository.findOneBy.mockResolvedValue(createMockMaterial());
      recyclingCenterRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.create(clientUser, {
          materialId: 'material-1',
          recyclingCenterId: 'center-999',
          weightKg: 2.5,
          qrCode: 'QR-NEW-005',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateRecord', () => {
    it('R-04: rechaza validacion si el rol no es Validador ni Admin', async () => {
      await expect(
        service.validateRecord('record-1', clientUser, {
          status: RecyclingRecordStatusEnum.VALIDADO,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('CB-07: rechaza validacion si el registro ya fue procesado (no PENDIENTE)', async () => {
      const txnMocks = setupBasicTransactionMocks();
      const processedRecord = createMockRecord({
        status: RecyclingRecordStatusEnum.VALIDADO,
      });

      txnMocks.recordRepo.findOne.mockResolvedValue(processedRecord);
      dataSource.transaction.mockImplementation(async (cb: any) => cb(txnMocks.txn));

      await expect(
        service.validateRecord('record-1', validatorUser, {
          status: RecyclingRecordStatusEnum.VALIDADO,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('CB-08: RECHAZADO no suma puntos ni crea WalletMovement', async () => {
      const txnMocks = setupBasicTransactionMocks();
      const record = createMockRecord();
      txnMocks.recordRepo.findOne.mockResolvedValue(record);
      txnMocks.recordRepo.save.mockResolvedValue(record);
      txnMocks.loadRecord.mockResolvedValue({ ...record, status: RecyclingRecordStatusEnum.RECHAZADO });

      dataSource.transaction.mockImplementation(async (cb: any) => cb(txnMocks.txn));

      const result = await service.validateRecord('record-1', validatorUser, {
        status: RecyclingRecordStatusEnum.RECHAZADO,
      });

      expect(result.status).toBe(RecyclingRecordStatusEnum.RECHAZADO);
      expect(txnMocks.walletRepo.findOne).not.toHaveBeenCalled();
    });

    it('R-02: Validador de centro B rechazado al validar reciclaje de centro A', async () => {
      userRecyclingCenterRepository.findOne.mockResolvedValue({
        recyclingCenterId: 'center-B',
        recyclingCenter: createMockCenter({ recyclingCenterId: 'center-B', name: 'Centro B' }),
        isActive: true,
        userId: 'validator-1',
        assignedAt: new Date(),
      });

      const txnMocks = setupBasicTransactionMocks();
      const record = createMockRecord({ recyclingCenterId: 'center-A' });
      txnMocks.recordRepo.findOne.mockResolvedValue(record);
      dataSource.transaction.mockImplementation(async (cb: any) => cb(txnMocks.txn));

      await expect(
        service.validateRecordForValidator('record-1', validatorUser, {
          status: RecyclingRecordStatusEnum.VALIDADO,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('R-05: doble validacion del mismo registro falla con 409', async () => {
      const txnMocks = setupBasicTransactionMocks();
      const pendingRecord = createMockRecord({ status: RecyclingRecordStatusEnum.PENDIENTE });
      const validatedRecord = createMockRecord({ status: RecyclingRecordStatusEnum.VALIDADO });

      txnMocks.recordRepo.findOne
        .mockResolvedValueOnce(pendingRecord)
        .mockResolvedValueOnce(validatedRecord);

      txnMocks.recordRepo.save
        .mockResolvedValueOnce(validatedRecord);

      txnMocks.userRepo.findOneBy.mockResolvedValue({
        userId: 'client-1',
        role: UserRoleEnum.CLIENTE,
      });

      txnMocks.walletRepo.findOne.mockResolvedValue({
        walletId: 'wallet-1',
        userId: 'client-1',
        availablePoints: 100,
        totalPoints: 100,
      });

      dataSource.transaction.mockImplementation(async (cb: any) => cb(txnMocks.txn));

      const result = await service.validateRecord('record-1', adminUser, {
        status: RecyclingRecordStatusEnum.VALIDADO,
      });

      expect(result.status).toBe(RecyclingRecordStatusEnum.VALIDADO);

      txnMocks.recordRepo.findOne.mockResolvedValue(validatedRecord);

      await expect(
        service.validateRecord('record-1', adminUser, {
          status: RecyclingRecordStatusEnum.VALIDADO,
        }),
      ).rejects.toThrow(ConflictException);
    }, 10000);

    it('VALIDADO suma puntos al wallet del cliente y crea movimientos', async () => {
      const txnMocks = setupBasicTransactionMocks();
      const record = createMockRecord({ earnedPoints: 30 });
      const wallet = { walletId: 'wallet-1', userId: 'client-1', availablePoints: 100, totalPoints: 100 };
      const user = { userId: 'client-1', role: UserRoleEnum.CLIENTE };

      txnMocks.recordRepo.findOne.mockResolvedValue(record);
      txnMocks.recordRepo.save.mockResolvedValue(record);
      txnMocks.userRepo.findOneBy.mockResolvedValue(user);
      txnMocks.walletRepo.findOne.mockResolvedValue(wallet);
      txnMocks.walletRepo.save.mockResolvedValue({
        ...wallet,
        availablePoints: 130,
        totalPoints: 130,
      });
      txnMocks.validationRepo.create.mockReturnValue({ recyclingRecordId: 'record-1', validatorUserId: 'admin-1' });
      txnMocks.validationRepo.save.mockResolvedValue({
        recyclingValidationId: 'validation-1',
        recyclingRecordId: 'record-1',
        validatorUserId: 'admin-1',
        validatedAt: new Date(),
      });
      txnMocks.movementRepo.create.mockImplementation((d: any) => d);
      txnMocks.movementRepo.save.mockImplementation((m: any) =>
        Promise.resolve({ ...m, walletMovementId: 'mov-1' }),
      );
      txnMocks.loadRecord.mockResolvedValue({
        ...createMockRecord({ earnedPoints: 30 }),
        status: RecyclingRecordStatusEnum.VALIDADO,
      });

      dataSource.transaction.mockImplementation(async (cb: any) => cb(txnMocks.txn));

      const result = await service.validateRecord('record-1', adminUser, {
        status: RecyclingRecordStatusEnum.VALIDADO,
      });

      expect(result.status).toBe(RecyclingRecordStatusEnum.VALIDADO);
    });
  });

  describe('findMine', () => {
    it('devuelve los registros del usuario autenticado', async () => {
      const records = [
        createMockRecord({ recyclingRecordId: 'r-1' }),
        createMockRecord({ recyclingRecordId: 'r-2', qrCode: 'QR-002' }),
      ];
      recyclingRecordRepository.find.mockResolvedValue(records);

      const result = await service.findMine('client-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('r-1');
      expect(recyclingRecordRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'client-1' },
          order: { createdAt: 'DESC' },
        }),
      );
    });

    it('devuelve array vacio si no hay registros', async () => {
      recyclingRecordRepository.find.mockResolvedValue([]);

      const result = await service.findMine('client-1');
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('devuelve un registro por id si el usuario es el propietario', async () => {
      const record = createMockRecord();
      recyclingRecordRepository.findOne.mockResolvedValue(record);

      const result = await service.findOne('record-1', clientUser);

      expect(result.id).toBe('record-1');
    });

    it('permite acceso al admin a cualquier registro', async () => {
      const record = createMockRecord({ userId: 'other-user' });
      recyclingRecordRepository.findOne.mockResolvedValue(record);

      const result = await service.findOne('record-1', adminUser);

      expect(result.id).toBe('record-1');
    });

    it('lanza ForbiddenException si el usuario no es propietario ni admin', async () => {
      const otherClient: AuthenticatedUser = {
        userId: 'other-client',
        email: 'other@test.com',
        role: UserRoleEnum.CLIENTE,
      };
      const record = createMockRecord({ userId: 'client-1' });
      recyclingRecordRepository.findOne.mockResolvedValue(record);

      await expect(service.findOne('record-1', otherClient)).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el registro no existe', async () => {
      recyclingRecordRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('record-999', clientUser)).rejects.toThrow(NotFoundException);
    });
  });
});

function setupBasicTransactionMocks() {
  const txn: any = {};

  const recordRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const validationRepo = {
    create: jest.fn().mockImplementation((d: any) => d),
    save: jest.fn().mockImplementation((v: any) => Promise.resolve({ ...v, recyclingValidationId: 'validation-1', validatedAt: new Date() })),
  };

  const userRepo = {
    findOneBy: jest.fn(),
  };

  const walletRepo = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((w: any) => Promise.resolve(w)),
  };

  const movementRepo = {
    create: jest.fn().mockImplementation((d: any) => d),
    save: jest.fn().mockImplementation((m: any) => Promise.resolve({ ...m, walletMovementId: 'mov-1' })),
  };

  const detailRepo = {
    create: jest.fn().mockImplementation((d: any) => d),
    save: jest.fn().mockResolvedValue({}),
  };

  const loadRecord = jest.fn();

  txn.getRepository = jest.fn((entityClass: any) => {
    if (entityClass === RecyclingRecordEntity) return recordRepo;
    if (entityClass === RecyclingValidationEntity) return validationRepo;
    if (entityClass === UserEntity) return userRepo;
    if (entityClass === WalletEntity) return walletRepo;
    if (entityClass === WalletMovementEntity) return movementRepo;
    if (entityClass === WalletMovementDetailEntity) return detailRepo;
    return {};
  });

  return { txn, recordRepo, validationRepo, userRepo, walletRepo, movementRepo, detailRepo, loadRecord };
}
