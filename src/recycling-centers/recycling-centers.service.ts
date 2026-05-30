import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { AuthenticatedUser } from '../auth/auth.types';
import { getCurrentWeekRange } from '../common/utils/week-range.utils';
import {
  RecyclingRecordStatusEnum,
  UserRoleEnum,
} from '../database/database.enums';
import { RecyclingRecordEntity } from '../recycling-records/entities/recycling-record.entity';
import { RecyclingCenterEntity } from './entities/recycling-center.entity';
import { CreateRecyclingCenterDto } from './dto/create-recycling-center.dto';
import { UserRecyclingCenterEntity } from './entities/user-recycling-center.entity';

@Injectable()
export class RecyclingCentersService {
  constructor(
    @InjectRepository(RecyclingCenterEntity)
    private readonly recyclingCenterRepository: Repository<RecyclingCenterEntity>,
    @InjectRepository(UserRecyclingCenterEntity)
    private readonly userRecyclingCenterRepository: Repository<UserRecyclingCenterEntity>,
    @InjectRepository(RecyclingRecordEntity)
    private readonly recyclingRecordRepository: Repository<RecyclingRecordEntity>,
  ) {}

  async findAll() {
    const centers = await this.recyclingCenterRepository.find({
      relations: { schedules: true },
      order: { isActive: 'DESC', name: 'ASC', schedules: { weekday: 'ASC' } },
    });

    return centers.map((center) => this.mapCenter(center));
  }

  async findOne(recyclingCenterId: string) {
    const center = await this.recyclingCenterRepository.findOne({
      where: { recyclingCenterId },
      relations: { schedules: true },
    });

    if (!center) {
      throw new NotFoundException('Centro de reciclaje no encontrado');
    }

    return this.mapCenter(center);
  }

  async create(createRecyclingCenterDto: CreateRecyclingCenterDto) {
    const center = this.recyclingCenterRepository.create({
      name: createRecyclingCenterDto.name.trim(),
      address: createRecyclingCenterDto.address.trim(),
      district: createRecyclingCenterDto.district?.trim() ?? null,
    });

    return this.mapCenter(await this.recyclingCenterRepository.save(center));
  }

  async findAssignedCenter(user: AuthenticatedUser) {
    const assignment = await this.getValidatorAssignment(user, true);

    const recyclingCenterId = assignment.recyclingCenterId;
    const [totalRecords, pendingRecords, validatedRecords, rejectedRecords] =
      await Promise.all([
        this.recyclingRecordRepository.count({ where: { recyclingCenterId } }),
        this.recyclingRecordRepository.count({
          where: {
            recyclingCenterId,
            status: RecyclingRecordStatusEnum.PENDIENTE,
          },
        }),
        this.recyclingRecordRepository.count({
          where: {
            recyclingCenterId,
            status: RecyclingRecordStatusEnum.VALIDADO,
          },
        }),
        this.recyclingRecordRepository.count({
          where: {
            recyclingCenterId,
            status: RecyclingRecordStatusEnum.RECHAZADO,
          },
        }),
      ]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayRecords = await this.recyclingRecordRepository
      .createQueryBuilder('record')
      .where('record.recyclingCenterId = :recyclingCenterId', {
        recyclingCenterId,
      })
      .andWhere('record.createdAt >= :startOfDay', { startOfDay })
      .getCount();

    return {
      assignment: {
        id: assignment.userRecyclingCenterId,
        assignedAt: assignment.assignedAt.toISOString(),
      },
      center: this.mapCenter(assignment.recyclingCenter),
      stats: {
        totalRecords,
        pendingRecords,
        validatedRecords,
        rejectedRecords,
        todayRecords,
      },
    };
  }

  async getWeeklyClientRanking(user: AuthenticatedUser) {
    const assignment = await this.getValidatorAssignment(user);
    const { startOfWeek, endOfWeek } = getCurrentWeekRange();

    const ranking = await this.recyclingRecordRepository
      .createQueryBuilder('record')
      .innerJoin('record.user', 'user')
      .select('user.userId', 'userId')
      .addSelect('user.firstNames', 'firstNames')
      .addSelect('user.lastNames', 'lastNames')
      .addSelect('COUNT(record.recyclingRecordId)', 'total_records')
      .addSelect(
        `SUM(CASE WHEN record.status = :validatedStatus THEN 1 ELSE 0 END)`,
        'validated_records',
      )
      .addSelect(
        `SUM(CASE WHEN record.status = :pendingStatus THEN 1 ELSE 0 END)`,
        'pending_records',
      )
      .addSelect('COALESCE(SUM(record.weightKg), 0)', 'total_weight_kg')
      .addSelect('COALESCE(SUM(record.earnedPoints), 0)', 'total_points')
      .where('record.recyclingCenterId = :recyclingCenterId', {
        recyclingCenterId: assignment.recyclingCenterId,
      })
      .andWhere('user.role = :role', { role: UserRoleEnum.CLIENTE })
      .andWhere('record.status != :rejectedStatus', {
        rejectedStatus: RecyclingRecordStatusEnum.RECHAZADO,
      })
      .andWhere('record.createdAt >= :startOfWeek', { startOfWeek })
      .andWhere('record.createdAt < :endOfWeek', { endOfWeek })
      .setParameters({
        validatedStatus: RecyclingRecordStatusEnum.VALIDADO,
        pendingStatus: RecyclingRecordStatusEnum.PENDIENTE,
      })
      .groupBy('user.userId')
      .addGroupBy('user.firstNames')
      .addGroupBy('user.lastNames')
      .orderBy('total_weight_kg', 'DESC')
      .addOrderBy('total_records', 'DESC')
      .addOrderBy('user.firstNames', 'ASC')
      .getRawMany<{
        userId: string;
        firstNames: string;
        lastNames: string;
        total_records: string;
        validated_records: string;
        pending_records: string;
        total_weight_kg: string;
        total_points: string;
      }>();

    return {
      center: {
        id: assignment.recyclingCenter.recyclingCenterId,
        name: assignment.recyclingCenter.name,
      },
      period: {
        startAt: startOfWeek.toISOString(),
        endAt: endOfWeek.toISOString(),
      },
      ranking: ranking.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        firstNames: entry.firstNames,
        lastNames: entry.lastNames,
        name: `${entry.firstNames} ${entry.lastNames}`.trim(),
        totalRecords: Number(entry.total_records),
        validatedRecords: Number(entry.validated_records),
        pendingRecords: Number(entry.pending_records),
        totalWeightKg: Number(entry.total_weight_kg),
        totalPoints: Number(entry.total_points),
      })),
    };
  }

  private assertValidatorRole(user: AuthenticatedUser) {
    if (user.role !== UserRoleEnum.VALIDADOR) {
      throw new ForbiddenException(
        'Solo el rol validador puede acceder a este modulo',
      );
    }
  }

  private async getValidatorAssignment(
    user: AuthenticatedUser,
    includeSchedules = false,
  ) {
    this.assertValidatorRole(user);

    const assignment = await this.userRecyclingCenterRepository.findOne({
      where: { userId: user.userId, isActive: true },
      relations: {
        recyclingCenter: includeSchedules ? { schedules: true } : true,
      },
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

  private mapCenter(center: RecyclingCenterEntity) {
    return {
      id: center.recyclingCenterId,
      name: center.name,
      address: center.address,
      district: center.district,
      isActive: center.isActive,
      schedules:
        center.schedules?.map((schedule) => ({
          id: schedule.scheduleId,
          weekday: schedule.weekday,
          attends: schedule.attends,
          openingTime: schedule.openingTime,
          closingTime: schedule.closingTime,
        })) ?? [],
      createdAt: center.createdAt.toISOString(),
      updatedAt: center.updatedAt.toISOString(),
    };
  }
}
