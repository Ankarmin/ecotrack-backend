import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';

import type { AuthenticatedUser } from '../auth/auth.types';
import {
  RecyclingRecordStatusEnum,
  UserRoleEnum,
  WalletMovementTypeEnum,
} from '../database/database.enums';
import { MaterialEntity } from '../materials/entities/material.entity';
import { RecyclingCenterEntity } from '../recycling-centers/entities/recycling-center.entity';
import { UserRecyclingCenterEntity } from '../recycling-centers/entities/user-recycling-center.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletMovementDetailEntity } from '../wallet/entities/wallet-movement-detail.entity';
import { WalletMovementEntity } from '../wallet/entities/wallet-movement.entity';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import { CreateRecyclingRecordDto } from './dto/create-recycling-record.dto';
import { FindValidatorRecyclingRecordsDto } from './dto/find-validator-recycling-records.dto';
import { ValidateRecyclingRecordByQrDto } from './dto/validate-recycling-record-by-qr.dto';
import { ValidateRecyclingRecordDto } from './dto/validate-recycling-record.dto';
import { RecyclingRecordEntity } from './entities/recycling-record.entity';
import { RecyclingValidationEntity } from './entities/recycling-validation.entity';

@Injectable()
export class RecyclingRecordsService {
  constructor(
    @InjectRepository(RecyclingRecordEntity)
    private readonly recyclingRecordRepository: Repository<RecyclingRecordEntity>,
    @InjectRepository(MaterialEntity)
    private readonly materialRepository: Repository<MaterialEntity>,
    @InjectRepository(RecyclingCenterEntity)
    private readonly recyclingCenterRepository: Repository<RecyclingCenterEntity>,
    @InjectRepository(UserRecyclingCenterEntity)
    private readonly userRecyclingCenterRepository: Repository<UserRecyclingCenterEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(user: AuthenticatedUser, createDto: CreateRecyclingRecordDto) {
    if (user.role !== UserRoleEnum.CLIENTE) {
      throw new ForbiddenException(
        'Solo los clientes pueden registrar reciclajes',
      );
    }

    const [material, recyclingCenter] = await Promise.all([
      this.materialRepository.findOneBy({ materialId: createDto.materialId }),
      this.recyclingCenterRepository.findOneBy({
        recyclingCenterId: createDto.recyclingCenterId,
      }),
    ]);

    if (!material || !material.isActive) {
      throw new NotFoundException('Material no encontrado o inactivo');
    }

    if (!recyclingCenter || !recyclingCenter.isActive) {
      throw new NotFoundException(
        'Centro de reciclaje no encontrado o inactivo',
      );
    }

    const existingRecord = await this.recyclingRecordRepository.findOneBy({
      qrCode: createDto.qrCode,
    });

    if (existingRecord) {
      throw new ConflictException('El codigo QR ya fue registrado');
    }

    const savedCo2 = Number(material.co2PerKg) * createDto.weightKg;
    const earnedPoints = Math.round(material.pointsPerKg * createDto.weightKg);

    const record = this.recyclingRecordRepository.create({
      userId: user.userId,
      materialId: material.materialId,
      recyclingCenterId: recyclingCenter.recyclingCenterId,
      weightKg: createDto.weightKg.toFixed(2),
      savedCo2: savedCo2.toFixed(2),
      earnedPoints,
      qrCode: createDto.qrCode,
      status: RecyclingRecordStatusEnum.PENDIENTE,
    });

    return this.mapRecord(await this.recyclingRecordRepository.save(record));
  }

  async findMine(userId: string) {
    const records = await this.recyclingRecordRepository.find({
      where: { userId },
      relations: { material: true, recyclingCenter: true, validation: true },
      order: { createdAt: 'DESC' },
    });

    return records.map((record) => this.mapRecord(record));
  }

  async findOne(recyclingRecordId: string, user: AuthenticatedUser) {
    const record = await this.recyclingRecordRepository.findOne({
      where: { recyclingRecordId },
      relations: {
        material: true,
        recyclingCenter: true,
        validation: true,
        user: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Registro de reciclaje no encontrado');
    }

    if (
      record.userId !== user.userId &&
      user.role !== UserRoleEnum.ADMINISTRADOR &&
      user.role !== UserRoleEnum.VALIDADOR
    ) {
      throw new ForbiddenException('No tienes acceso a este registro');
    }

    return this.mapRecord(record);
  }

  async findForValidator(
    validator: AuthenticatedUser,
    query: FindValidatorRecyclingRecordsDto,
  ) {
    const assignment = await this.getValidatorAssignment(validator);

    const builder = this.recyclingRecordRepository
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.material', 'material')
      .leftJoinAndSelect('record.recyclingCenter', 'recyclingCenter')
      .leftJoinAndSelect('record.validation', 'validation')
      .leftJoinAndSelect('record.user', 'user')
      .where('record.recyclingCenterId = :recyclingCenterId', {
        recyclingCenterId: assignment.recyclingCenterId,
      })
      .orderBy('record.createdAt', 'DESC');

    if (query.status) {
      builder.andWhere('record.status = :status', { status: query.status });
    }

    if (query.search) {
      const search = `%${query.search}%`;
      builder.andWhere(
        new Brackets((subQuery) => {
          subQuery
            .where('record.qrCode ILIKE :search', { search })
            .orWhere('material.name ILIKE :search', { search })
            .orWhere('user.firstNames ILIKE :search', { search })
            .orWhere('user.lastNames ILIKE :search', { search });
        }),
      );
    }

    const records = await builder.getMany();

    return {
      center: {
        id: assignment.recyclingCenter.recyclingCenterId,
        name: assignment.recyclingCenter.name,
      },
      records: records.map((record) => this.mapRecord(record)),
    };
  }

  async findOneForValidator(
    recyclingRecordId: string,
    validator: AuthenticatedUser,
  ) {
    const assignment = await this.getValidatorAssignment(validator);

    const record = await this.recyclingRecordRepository.findOne({
      where: {
        recyclingRecordId,
        recyclingCenterId: assignment.recyclingCenterId,
      },
      relations: {
        material: true,
        recyclingCenter: true,
        validation: true,
        user: true,
      },
    });

    if (!record) {
      throw new NotFoundException(
        'No se encontro el reciclaje en tu centro de acopio',
      );
    }

    return this.mapRecord(record);
  }

  async validateRecord(
    recyclingRecordId: string,
    validator: AuthenticatedUser,
    validateDto: ValidateRecyclingRecordDto,
  ) {
    if (
      validator.role !== UserRoleEnum.VALIDADOR &&
      validator.role !== UserRoleEnum.ADMINISTRADOR
    ) {
      throw new ForbiddenException(
        'Solo un validador o administrador puede validar',
      );
    }

    return this.processValidation(recyclingRecordId, validator, validateDto);
  }

  async validateRecordForValidator(
    recyclingRecordId: string,
    validator: AuthenticatedUser,
    validateDto: ValidateRecyclingRecordDto,
  ) {
    const assignment = await this.getValidatorAssignment(validator);

    return this.processValidation(recyclingRecordId, validator, validateDto, {
      expectedCenterId: assignment.recyclingCenterId,
      validatorOnly: true,
    });
  }

  async validateRecordByQr(
    validator: AuthenticatedUser,
    validateDto: ValidateRecyclingRecordByQrDto,
  ) {
    const assignment = await this.getValidatorAssignment(validator);
    const record = await this.recyclingRecordRepository.findOne({
      where: { qrCode: validateDto.qrCode },
      select: {
        recyclingRecordId: true,
        recyclingCenterId: true,
      },
    });

    if (!record) {
      throw new NotFoundException(
        'No se encontro un reciclaje con ese codigo QR',
      );
    }

    return this.processValidation(
      record.recyclingRecordId,
      validator,
      validateDto,
      {
        expectedCenterId: assignment.recyclingCenterId,
        validatorOnly: true,
      },
    );
  }

  private async processValidation(
    recyclingRecordId: string,
    validator: AuthenticatedUser,
    validateDto: ValidateRecyclingRecordDto,
    options?: {
      expectedCenterId?: string;
      validatorOnly?: boolean;
    },
  ) {
    this.assertValidationAccess(validator, options?.validatorOnly ?? false);

    return this.dataSource.transaction(async (manager) => {
      const recordRepository = manager.getRepository(RecyclingRecordEntity);
      const validationRepository = manager.getRepository(
        RecyclingValidationEntity,
      );
      const userRepository = manager.getRepository(UserEntity);
      const walletRepository = manager.getRepository(WalletEntity);
      const walletMovementRepository =
        manager.getRepository(WalletMovementEntity);
      const walletMovementDetailRepository = manager.getRepository(
        WalletMovementDetailEntity,
      );

      const record = await recordRepository.findOne({
        where: { recyclingRecordId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!record) {
        throw new NotFoundException('Registro de reciclaje no encontrado');
      }

      if (
        options?.expectedCenterId &&
        record.recyclingCenterId !== options.expectedCenterId
      ) {
        throw new ForbiddenException(
          'Este reciclaje no pertenece a tu centro de acopio',
        );
      }

      if (record.status !== RecyclingRecordStatusEnum.PENDIENTE) {
        throw new ConflictException('El registro ya fue procesado');
      }

      record.status = validateDto.status;
      await recordRepository.save(record);

      if (validateDto.status === RecyclingRecordStatusEnum.RECHAZADO) {
        return this.loadMappedRecord(manager, record.recyclingRecordId);
      }

      const validation = validationRepository.create({
        recyclingRecordId: record.recyclingRecordId,
        validatorUserId: validator.userId,
      });

      const savedValidation = await validationRepository.save(validation);
      const recordOwner = await userRepository.findOneBy({
        userId: record.userId,
      });

      if (!recordOwner) {
        throw new NotFoundException(
          'Usuario asociado al reciclaje no encontrado',
        );
      }

      if (recordOwner.role !== UserRoleEnum.CLIENTE) {
        throw new ConflictException(
          'Solo los reciclajes de clientes pueden generar EcoPuntos',
        );
      }

      const wallet = await walletRepository.findOne({
        where: { userId: record.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Billetera no encontrada');
      }

      wallet.availablePoints += record.earnedPoints;
      wallet.totalPoints += record.earnedPoints;
      await walletRepository.save(wallet);

      const movement = walletMovementRepository.create({
        walletId: wallet.walletId,
        movementType: WalletMovementTypeEnum.GANANCIA,
        points: record.earnedPoints,
      });

      const savedMovement = await walletMovementRepository.save(movement);

      const detail = walletMovementDetailRepository.create({
        walletMovementId: savedMovement.walletMovementId,
        recyclingValidationId: savedValidation.recyclingValidationId,
      });

      await walletMovementDetailRepository.save(detail);

      return this.loadMappedRecord(manager, record.recyclingRecordId);
    });
  }

  private async loadMappedRecord(
    manager: EntityManager,
    recyclingRecordId: string,
  ) {
    const record = await manager.getRepository(RecyclingRecordEntity).findOne({
      where: { recyclingRecordId },
      relations: {
        material: true,
        recyclingCenter: true,
        validation: true,
        user: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Registro de reciclaje no encontrado');
    }

    return this.mapRecord(record);
  }

  private assertValidationAccess(
    validator: AuthenticatedUser,
    validatorOnly: boolean,
  ) {
    if (validatorOnly) {
      if (validator.role !== UserRoleEnum.VALIDADOR) {
        throw new ForbiddenException(
          'Solo el rol validador puede acceder a este modulo',
        );
      }

      return;
    }

    if (
      validator.role !== UserRoleEnum.VALIDADOR &&
      validator.role !== UserRoleEnum.ADMINISTRADOR
    ) {
      throw new ForbiddenException(
        'Solo un validador o administrador puede validar',
      );
    }
  }

  private async getValidatorAssignment(validator: AuthenticatedUser) {
    if (validator.role !== UserRoleEnum.VALIDADOR) {
      throw new ForbiddenException(
        'Solo el rol validador puede acceder a este modulo',
      );
    }

    const assignment = await this.userRecyclingCenterRepository.findOne({
      where: { userId: validator.userId, isActive: true },
      relations: { recyclingCenter: true },
      order: { assignedAt: 'DESC' },
    });

    if (!assignment || !assignment.recyclingCenter) {
      throw new NotFoundException('No tienes un centro de acopio asignado');
    }

    if (!assignment.recyclingCenter.isActive) {
      throw new NotFoundException('Tu centro de acopio asignado esta inactivo');
    }

    return assignment;
  }

  private mapRecord(record: RecyclingRecordEntity) {
    return {
      id: record.recyclingRecordId,
      userId: record.userId,
      materialId: record.materialId,
      recyclingCenterId: record.recyclingCenterId,
      weightKg: Number(record.weightKg),
      savedCo2: Number(record.savedCo2),
      earnedPoints: record.earnedPoints,
      qrCode: record.qrCode,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      user: record.user
        ? {
            id: record.user.userId,
            firstNames: record.user.firstNames,
            lastNames: record.user.lastNames,
            name: `${record.user.firstNames} ${record.user.lastNames}`.trim(),
          }
        : null,
      material: record.material
        ? {
            id: record.material.materialId,
            name: record.material.name,
          }
        : null,
      recyclingCenter: record.recyclingCenter
        ? {
            id: record.recyclingCenter.recyclingCenterId,
            name: record.recyclingCenter.name,
          }
        : null,
      validation: record.validation
        ? {
            id: record.validation.recyclingValidationId,
            validatorUserId: record.validation.validatorUserId,
            validatedAt: record.validation.validatedAt.toISOString(),
          }
        : null,
    };
  }
}
