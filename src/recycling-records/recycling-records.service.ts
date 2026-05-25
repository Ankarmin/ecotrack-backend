import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import type { AuthenticatedUser } from '../auth/auth.types';
import {
  RecyclingRecordStatusEnum,
  UserRoleEnum,
  WalletMovementTypeEnum,
} from '../database/database.enums';
import { MaterialEntity } from '../materials/entities/material.entity';
import { RecyclingCenterEntity } from '../recycling-centers/entities/recycling-center.entity';
import { WalletMovementDetailEntity } from '../wallet/entities/wallet-movement-detail.entity';
import { WalletMovementEntity } from '../wallet/entities/wallet-movement.entity';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import { CreateRecyclingRecordDto } from './dto/create-recycling-record.dto';
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
    private readonly dataSource: DataSource,
  ) {}

  async create(user: AuthenticatedUser, createDto: CreateRecyclingRecordDto) {
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
      relations: { material: true, recyclingCenter: true, validation: true },
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

    return this.dataSource.transaction(async (manager) => {
      const recordRepository = manager.getRepository(RecyclingRecordEntity);
      const validationRepository = manager.getRepository(
        RecyclingValidationEntity,
      );
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

      if (record.status !== RecyclingRecordStatusEnum.PENDIENTE) {
        throw new ConflictException('El registro ya fue procesado');
      }

      record.status = validateDto.status;
      await recordRepository.save(record);

      if (validateDto.status === RecyclingRecordStatusEnum.RECHAZADO) {
        return this.mapRecord(record);
      }

      const validation = validationRepository.create({
        recyclingRecordId: record.recyclingRecordId,
        validatorUserId: validator.userId,
      });

      const savedValidation = await validationRepository.save(validation);
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

      return this.findOne(record.recyclingRecordId, validator);
    });
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
