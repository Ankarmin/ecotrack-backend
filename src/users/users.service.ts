import { roleHasWallet } from '../auth/user-role.utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { getCurrentWeekRange } from '../common/utils/week-range.utils';
import {
  RecyclingRecordStatusEnum,
  UserRoleEnum,
} from '../database/database.enums';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { userId },
      relations: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      user: {
        id: user.userId,
        firstNames: user.firstNames,
        lastNames: user.lastNames,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      wallet:
        roleHasWallet(user.role) && user.wallet
          ? {
              walletId: user.wallet.walletId,
              availablePoints: user.wallet.availablePoints,
              totalPoints: user.wallet.totalPoints,
            }
          : null,
    };
  }

  async getWeeklyRanking(currentUserId: string) {
    const { startOfWeek, endOfWeek } = getCurrentWeekRange();

    const ranking = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('recycling_records', 'record', 'record.user_id = user.user_id')
      .select('user.user_id', 'userId')
      .addSelect('user.first_names', 'firstNames')
      .addSelect('user.last_names', 'lastNames')
      .addSelect('COUNT(record.recycling_record_id)', 'total_records')
      .addSelect(
        `SUM(CASE WHEN record.status = :validatedStatus THEN 1 ELSE 0 END)`,
        'validated_records',
      )
      .addSelect(
        `SUM(CASE WHEN record.status = :pendingStatus THEN 1 ELSE 0 END)`,
        'pending_records',
      )
      .addSelect('COALESCE(SUM(record.weight_kg), 0)', 'total_weight_kg')
      .addSelect('COALESCE(SUM(record.earned_points), 0)', 'total_points')
      .where('user.role = :role', { role: UserRoleEnum.CLIENTE })
      .andWhere('record.status != :rejectedStatus', {
        rejectedStatus: RecyclingRecordStatusEnum.RECHAZADO,
      })
      .andWhere('record.created_at >= :startOfWeek', { startOfWeek })
      .andWhere('record.created_at < :endOfWeek', { endOfWeek })
      .setParameters({
        validatedStatus: RecyclingRecordStatusEnum.VALIDADO,
        pendingStatus: RecyclingRecordStatusEnum.PENDIENTE,
      })
      .groupBy('user.user_id')
      .addGroupBy('user.first_names')
      .addGroupBy('user.last_names')
      .orderBy('total_weight_kg', 'DESC')
      .addOrderBy('total_records', 'DESC')
      .addOrderBy('user.first_names', 'ASC')
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
        isCurrentUser: entry.userId === currentUserId,
      })),
    };
  }
}
