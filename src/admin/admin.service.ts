import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { getCurrentWeekRange } from '../common/utils/week-range.utils';
import { CouponRedemptionEntity } from '../coupons/entities/coupon-redemption.entity';
import { CouponEntity } from '../coupons/entities/coupon.entity';
import {
  CouponRedemptionStatusEnum,
  RecyclingRecordStatusEnum,
  UserRoleEnum,
  WeekdayEnum,
} from '../database/database.enums';
import { MaterialEntity } from '../materials/entities/material.entity';
import { RecyclingCenterEntity } from '../recycling-centers/entities/recycling-center.entity';
import { RecyclingCenterScheduleEntity } from '../recycling-centers/entities/recycling-center-schedule.entity';
import { UserRecyclingCenterEntity } from '../recycling-centers/entities/user-recycling-center.entity';
import { RecyclingRecordEntity } from '../recycling-records/entities/recycling-record.entity';
import { RecyclingValidationEntity } from '../recycling-records/entities/recycling-validation.entity';
import { UserEntity } from '../users/entities/user.entity';
import { PasswordService } from '../auth/password.service';
import { CreateAdminCouponDto } from './dto/create-admin-coupon.dto';
import { CreateAdminRecyclingCenterDto } from './dto/create-admin-recycling-center.dto';
import { CreateAdminValidatorDto } from './dto/create-admin-validator.dto';
import { RecyclingCenterScheduleInputDto } from './dto/recycling-center-schedule-input.dto';
import { UpdateAdminCouponDto } from './dto/update-admin-coupon.dto';
import { UpdateAdminRecyclingCenterDto } from './dto/update-admin-recycling-center.dto';

type CenterOverviewOptions = {
  includeMaterials?: boolean;
  includeRecentRecords?: boolean;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(RecyclingCenterEntity)
    private readonly recyclingCenterRepository: Repository<RecyclingCenterEntity>,
    @InjectRepository(RecyclingCenterScheduleEntity)
    private readonly recyclingCenterScheduleRepository: Repository<RecyclingCenterScheduleEntity>,
    @InjectRepository(UserRecyclingCenterEntity)
    private readonly userRecyclingCenterRepository: Repository<UserRecyclingCenterEntity>,
    @InjectRepository(RecyclingRecordEntity)
    private readonly recyclingRecordRepository: Repository<RecyclingRecordEntity>,
    @InjectRepository(RecyclingValidationEntity)
    private readonly recyclingValidationRepository: Repository<RecyclingValidationEntity>,
    @InjectRepository(MaterialEntity)
    private readonly materialRepository: Repository<MaterialEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CouponEntity)
    private readonly couponRepository: Repository<CouponEntity>,
    @InjectRepository(CouponRedemptionEntity)
    private readonly couponRedemptionRepository: Repository<CouponRedemptionEntity>,
    private readonly dataSource: DataSource,
    private readonly passwordService: PasswordService,
  ) {}

  async getDashboard() {
    const [
      centers,
      coupons,
      totalUsers,
      totalValidators,
      totalRecords,
      pendingRecords,
      validatedRecords,
      totalWeightRaw,
      recentRecords,
    ] = await Promise.all([
      this.recyclingCenterRepository.find({ order: { name: 'ASC' } }),
      this.couponRepository.find({ order: { updatedAt: 'DESC' }, take: 5 }),
      this.userRepository.count(),
      this.userRepository.count({ where: { role: UserRoleEnum.VALIDADOR } }),
      this.recyclingRecordRepository.count(),
      this.recyclingRecordRepository.count({
        where: { status: RecyclingRecordStatusEnum.PENDIENTE },
      }),
      this.recyclingRecordRepository.count({
        where: { status: RecyclingRecordStatusEnum.VALIDADO },
      }),
      this.recyclingRecordRepository
        .createQueryBuilder('record')
        .select('COALESCE(SUM(record.weightKg), 0)', 'totalWeightKg')
        .getRawOne<{ totalWeightKg: string }>(),
      this.recyclingRecordRepository.find({
        relations: {
          user: true,
          material: true,
          recyclingCenter: true,
          validation: true,
        },
        order: { createdAt: 'DESC' },
        take: 8,
      }),
    ]);

    const centerPreviews = await Promise.all(
      centers.slice(0, 4).map((center) => this.buildCenterOverview(center)),
    );

    const couponPreviews = await Promise.all(
      coupons.map((coupon) => this.buildCouponOverview(coupon)),
    );

    return {
      stats: {
        totalCenters: centers.length,
        activeCenters: centers.filter((center) => center.isActive).length,
        inactiveCenters: centers.filter((center) => !center.isActive).length,
        totalCoupons: await this.couponRepository.count(),
        activeCoupons: await this.couponRepository.count({
          where: { isActive: true },
        }),
        totalUsers,
        totalValidators,
        totalRecords,
        pendingRecords,
        validatedRecords,
        totalWeightKg: Number(totalWeightRaw?.totalWeightKg ?? 0),
      },
      centers: centerPreviews,
      coupons: couponPreviews,
      recentRecords: recentRecords.map((record) => this.mapRecord(record)),
    };
  }

  async getWeeklyCenterRanking() {
    const { startOfWeek, endOfWeek } = getCurrentWeekRange();

    const ranking = await this.recyclingCenterRepository
      .createQueryBuilder('center')
      .innerJoin(
        'recycling_records',
        'record',
        'record.recycling_center_id = center.recycling_center_id',
      )
      .select('center.recycling_center_id', 'centerId')
      .addSelect('center.name', 'name')
      .addSelect('center.address', 'address')
      .addSelect('center.district', 'district')
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
      .where('record.status != :rejectedStatus', {
        rejectedStatus: RecyclingRecordStatusEnum.RECHAZADO,
      })
      .andWhere('record.created_at >= :startOfWeek', { startOfWeek })
      .andWhere('record.created_at < :endOfWeek', { endOfWeek })
      .setParameters({
        validatedStatus: RecyclingRecordStatusEnum.VALIDADO,
        pendingStatus: RecyclingRecordStatusEnum.PENDIENTE,
      })
      .groupBy('center.recycling_center_id')
      .addGroupBy('center.name')
      .addGroupBy('center.address')
      .addGroupBy('center.district')
      .orderBy('total_weight_kg', 'DESC')
      .addOrderBy('total_records', 'DESC')
      .addOrderBy('center.name', 'ASC')
      .getRawMany<{
        centerId: string;
        name: string;
        address: string;
        district: string | null;
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
        centerId: entry.centerId,
        name: entry.name,
        address: entry.address,
        district: entry.district,
        totalRecords: Number(entry.total_records),
        validatedRecords: Number(entry.validated_records),
        pendingRecords: Number(entry.pending_records),
        totalWeightKg: Number(entry.total_weight_kg),
        totalPoints: Number(entry.total_points),
      })),
    };
  }

  async findAllCenters() {
    const centers = await this.recyclingCenterRepository.find({
      relations: { schedules: true },
      order: { isActive: 'DESC', name: 'ASC', schedules: { weekday: 'ASC' } },
    });

    return Promise.all(
      centers.map((center) =>
        this.buildCenterOverview(center, { includeMaterials: true }),
      ),
    );
  }

  async findOneCenter(recyclingCenterId: string) {
    const center = await this.recyclingCenterRepository.findOne({
      where: { recyclingCenterId },
      relations: { schedules: true },
      order: { schedules: { weekday: 'ASC' } },
    });

    if (!center) {
      throw new NotFoundException('Centro de acopio no encontrado');
    }

    return this.buildCenterOverview(center, {
      includeMaterials: true,
      includeRecentRecords: true,
    });
  }

  async createCenter(createDto: CreateAdminRecyclingCenterDto) {
    return this.dataSource.transaction(async (manager) => {
      const centerRepository = manager.getRepository(RecyclingCenterEntity);

      const center = centerRepository.create({
        name: createDto.name.trim(),
        address: createDto.address.trim(),
        district: this.normalizeNullable(createDto.district),
        isActive: createDto.isActive ?? true,
      });

      const savedCenter = await centerRepository.save(center);

      await this.syncSchedules(
        manager,
        savedCenter.recyclingCenterId,
        createDto.schedules ?? [],
      );
      await this.syncValidatorAssignments(
        manager,
        savedCenter.recyclingCenterId,
        createDto.validatorUserIds ?? [],
      );

      return this.findOneCenter(savedCenter.recyclingCenterId);
    });
  }

  async updateCenter(
    recyclingCenterId: string,
    updateDto: UpdateAdminRecyclingCenterDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const centerRepository = manager.getRepository(RecyclingCenterEntity);
      const center = await centerRepository.findOneBy({ recyclingCenterId });

      if (!center) {
        throw new NotFoundException('Centro de acopio no encontrado');
      }

      if (updateDto.name !== undefined) {
        center.name = updateDto.name.trim();
      }

      if (updateDto.address !== undefined) {
        center.address = updateDto.address.trim();
      }

      if (updateDto.district !== undefined) {
        center.district = this.normalizeNullable(updateDto.district);
      }

      if (updateDto.isActive !== undefined) {
        center.isActive = updateDto.isActive;
      }

      await centerRepository.save(center);

      if (updateDto.schedules) {
        await this.syncSchedules(
          manager,
          recyclingCenterId,
          updateDto.schedules,
        );
      }

      if (updateDto.validatorUserIds) {
        await this.syncValidatorAssignments(
          manager,
          recyclingCenterId,
          updateDto.validatorUserIds,
        );
      }

      if (updateDto.isActive === false) {
        await manager
          .getRepository(UserRecyclingCenterEntity)
          .update({ recyclingCenterId, isActive: true }, { isActive: false });
      }

      return this.findOneCenter(recyclingCenterId);
    });
  }

  async deactivateCenter(recyclingCenterId: string) {
    return this.updateCenter(recyclingCenterId, { isActive: false });
  }

  async findValidators() {
    const validators = await this.userRepository.find({
      where: { role: UserRoleEnum.VALIDADOR },
      order: { firstNames: 'ASC', lastNames: 'ASC' },
    });

    return Promise.all(
      validators.map(async (validator) => {
        const assignment = await this.userRecyclingCenterRepository.findOne({
          where: { userId: validator.userId, isActive: true },
          relations: { recyclingCenter: true },
          order: { assignedAt: 'DESC' },
        });

        return {
          id: validator.userId,
          firstNames: validator.firstNames,
          lastNames: validator.lastNames,
          name: `${validator.firstNames} ${validator.lastNames}`.trim(),
          email: validator.email,
          phone: validator.phone,
          assignedCenter: assignment?.recyclingCenter
            ? {
                id: assignment.recyclingCenter.recyclingCenterId,
                name: assignment.recyclingCenter.name,
              }
            : null,
        };
      }),
    );
  }

  async createValidator(createDto: CreateAdminValidatorDto) {
    const email = createDto.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOne({
      where: { email },
      select: { userId: true },
    });

    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    try {
      const passwordHash = await this.passwordService.hashPassword(
        createDto.password,
      );

      const user = this.userRepository.create({
        firstNames: createDto.firstNames.trim(),
        lastNames: createDto.lastNames.trim(),
        email,
        phone: createDto.phone.trim(),
        password: passwordHash,
        role: UserRoleEnum.VALIDADOR,
      });

      const savedUser = await this.userRepository.save(user);

      return {
        id: savedUser.userId,
        firstNames: savedUser.firstNames,
        lastNames: savedUser.lastNames,
        name: `${savedUser.firstNames} ${savedUser.lastNames}`.trim(),
        email: savedUser.email,
        phone: savedUser.phone,
        assignedCenter: null,
      };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }

      throw error;
    }
  }

  async findAllCoupons() {
    const coupons = await this.couponRepository.find({
      order: { isActive: 'DESC', updatedAt: 'DESC', requiredPoints: 'ASC' },
    });

    return Promise.all(
      coupons.map((coupon) => this.buildCouponOverview(coupon)),
    );
  }

  async findOneCoupon(couponId: string) {
    const coupon = await this.couponRepository.findOneBy({ couponId });

    if (!coupon) {
      throw new NotFoundException('Cupon no encontrado');
    }

    return this.buildCouponOverview(coupon);
  }

  async createCoupon(createDto: CreateAdminCouponDto) {
    const coupon = this.couponRepository.create({
      title: createDto.title.trim(),
      description: this.normalizeNullable(createDto.description),
      requiredPoints: createDto.requiredPoints,
      stock: createDto.stock,
      validityDays: createDto.validityDays ?? 30,
      isActive: createDto.isActive ?? true,
    });

    return this.buildCouponOverview(await this.couponRepository.save(coupon));
  }

  async updateCoupon(couponId: string, updateDto: UpdateAdminCouponDto) {
    const coupon = await this.couponRepository.findOneBy({ couponId });

    if (!coupon) {
      throw new NotFoundException('Cupon no encontrado');
    }

    if (updateDto.title !== undefined) {
      coupon.title = updateDto.title.trim();
    }

    if (updateDto.description !== undefined) {
      coupon.description = this.normalizeNullable(updateDto.description);
    }

    if (updateDto.requiredPoints !== undefined) {
      coupon.requiredPoints = updateDto.requiredPoints;
    }

    if (updateDto.stock !== undefined) {
      coupon.stock = updateDto.stock;
    }

    if (updateDto.validityDays !== undefined) {
      coupon.validityDays = updateDto.validityDays;
    }

    if (updateDto.isActive !== undefined) {
      coupon.isActive = updateDto.isActive;
    }

    return this.buildCouponOverview(await this.couponRepository.save(coupon));
  }

  async deactivateCoupon(couponId: string) {
    return this.updateCoupon(couponId, { isActive: false });
  }

  private async buildCenterOverview(
    center: RecyclingCenterEntity,
    options: CenterOverviewOptions = {},
  ) {
    const [validators, statsRaw, materialsRaw, recentRecords] =
      await Promise.all([
        this.userRecyclingCenterRepository.find({
          where: {
            recyclingCenterId: center.recyclingCenterId,
            isActive: true,
          },
          relations: { user: true },
          order: { assignedAt: 'DESC' },
        }),
        this.recyclingRecordRepository
          .createQueryBuilder('record')
          .select('COUNT(*)', 'total_records')
          .addSelect(
            `SUM(CASE WHEN record.status = :validatedStatus THEN 1 ELSE 0 END)`,
            'validated_records',
          )
          .addSelect(
            `SUM(CASE WHEN record.status = :pendingStatus THEN 1 ELSE 0 END)`,
            'pending_records',
          )
          .addSelect(
            `SUM(CASE WHEN record.status = :rejectedStatus THEN 1 ELSE 0 END)`,
            'rejected_records',
          )
          .addSelect('COALESCE(SUM(record.weightKg), 0)', 'total_weight_kg')
          .addSelect('COALESCE(SUM(record.savedCo2), 0)', 'total_saved_co2')
          .addSelect('COALESCE(SUM(record.earnedPoints), 0)', 'total_points')
          .addSelect('COUNT(DISTINCT record.userId)', 'unique_users')
          .where('record.recyclingCenterId = :recyclingCenterId', {
            recyclingCenterId: center.recyclingCenterId,
          })
          .setParameters({
            validatedStatus: RecyclingRecordStatusEnum.VALIDADO,
            pendingStatus: RecyclingRecordStatusEnum.PENDIENTE,
            rejectedStatus: RecyclingRecordStatusEnum.RECHAZADO,
          })
          .getRawOne<{
            total_records: string;
            validated_records: string;
            pending_records: string;
            rejected_records: string;
            total_weight_kg: string;
            total_saved_co2: string;
            total_points: string;
            unique_users: string;
          }>(),
        options.includeMaterials
          ? this.recyclingRecordRepository
              .createQueryBuilder('record')
              .leftJoin('record.material', 'material')
              .select('record.materialId', 'materialId')
              .addSelect('material.name', 'materialName')
              .addSelect('COUNT(*)', 'records_count')
              .addSelect('COALESCE(SUM(record.weightKg), 0)', 'weight_kg')
              .addSelect(
                `SUM(CASE WHEN record.status = :validatedStatus THEN 1 ELSE 0 END)`,
                'validated_records',
              )
              .addSelect(
                `SUM(CASE WHEN record.status = :pendingStatus THEN 1 ELSE 0 END)`,
                'pending_records',
              )
              .where('record.recyclingCenterId = :recyclingCenterId', {
                recyclingCenterId: center.recyclingCenterId,
              })
              .groupBy('record.materialId')
              .addGroupBy('material.name')
              .setParameters({
                validatedStatus: RecyclingRecordStatusEnum.VALIDADO,
                pendingStatus: RecyclingRecordStatusEnum.PENDIENTE,
              })
              .orderBy('weight_kg', 'DESC')
              .getRawMany<{
                materialId: string;
                materialName: string;
                records_count: string;
                weight_kg: string;
                validated_records: string;
                pending_records: string;
              }>()
          : Promise.resolve([]),
        options.includeRecentRecords
          ? this.recyclingRecordRepository.find({
              where: { recyclingCenterId: center.recyclingCenterId },
              relations: {
                user: true,
                material: true,
                recyclingCenter: true,
                validation: true,
              },
              order: { createdAt: 'DESC' },
              take: 10,
            })
          : Promise.resolve([]),
      ]);

    return {
      id: center.recyclingCenterId,
      name: center.name,
      address: center.address,
      district: center.district,
      isActive: center.isActive,
      operationalStatus: this.getCenterOperationalStatus(
        center.isActive,
        validators.length,
      ),
      schedules: (center.schedules ?? [])
        .slice()
        .sort(
          (left, right) =>
            this.getWeekdayOrder(left.weekday) -
            this.getWeekdayOrder(right.weekday),
        )
        .map((schedule) => this.mapSchedule(schedule)),
      validators: validators.map((assignment) => ({
        assignmentId: assignment.userRecyclingCenterId,
        userId: assignment.userId,
        assignedAt: assignment.assignedAt.toISOString(),
        user: {
          id: assignment.user.userId,
          firstNames: assignment.user.firstNames,
          lastNames: assignment.user.lastNames,
          name: `${assignment.user.firstNames} ${assignment.user.lastNames}`.trim(),
          email: assignment.user.email,
          phone: assignment.user.phone,
        },
      })),
      stats: {
        totalRecords: Number(statsRaw?.total_records ?? 0),
        validatedRecords: Number(statsRaw?.validated_records ?? 0),
        pendingRecords: Number(statsRaw?.pending_records ?? 0),
        rejectedRecords: Number(statsRaw?.rejected_records ?? 0),
        totalWeightKg: Number(statsRaw?.total_weight_kg ?? 0),
        totalSavedCo2: Number(statsRaw?.total_saved_co2 ?? 0),
        totalPoints: Number(statsRaw?.total_points ?? 0),
        uniqueUsers: Number(statsRaw?.unique_users ?? 0),
        materials: materialsRaw.map((material) => ({
          materialId: material.materialId,
          name: material.materialName,
          recordsCount: Number(material.records_count),
          weightKg: Number(material.weight_kg),
          validatedRecords: Number(material.validated_records),
          pendingRecords: Number(material.pending_records),
        })),
      },
      recentRecords: recentRecords.map((record) => this.mapRecord(record)),
      createdAt: center.createdAt.toISOString(),
      updatedAt: center.updatedAt.toISOString(),
    };
  }

  private async buildCouponOverview(coupon: CouponEntity) {
    const redemptions = await this.couponRedemptionRepository.find({
      where: { couponId: coupon.couponId },
      order: { redeemedAt: 'DESC' },
      take: 20,
    });

    const now = new Date();
    const expiresAt = this.getCouponExpiresAt(coupon);
    const expiredCount = redemptions.filter(
      (redemption) =>
        redemption.status === CouponRedemptionStatusEnum.EXPIRADO ||
        redemption.expiresAt < now,
    ).length;
    const usedCount = redemptions.filter(
      (redemption) => redemption.status === CouponRedemptionStatusEnum.USADO,
    ).length;
    const redeemedCount = redemptions.filter(
      (redemption) => redemption.status === CouponRedemptionStatusEnum.CANJEADO,
    ).length;

    return {
      id: coupon.couponId,
      title: coupon.title,
      description: coupon.description,
      requiredPoints: coupon.requiredPoints,
      stock: coupon.stock,
      validityDays: coupon.validityDays,
      isActive: coupon.isActive,
      status: this.getCouponStatus(coupon),
      expiresAt: expiresAt.toISOString(),
      conditions: {
        minimumPoints: coupon.requiredPoints,
        stock: coupon.stock,
        validityDays: coupon.validityDays,
      },
      stats: {
        totalRedemptions: redemptions.length,
        redeemedCount,
        usedCount,
        expiredCount,
      },
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    };
  }

  private async syncSchedules(
    manager: DataSource['manager'],
    recyclingCenterId: string,
    schedules: RecyclingCenterScheduleInputDto[],
  ) {
    this.validateSchedules(schedules);

    const scheduleRepository = manager.getRepository(
      RecyclingCenterScheduleEntity,
    );
    const existingSchedules = await scheduleRepository.find({
      where: { recyclingCenterId },
    });
    const existingByWeekday = new Map(
      existingSchedules.map((schedule) => [schedule.weekday, schedule]),
    );
    const incomingWeekdays = new Set(
      schedules.map((schedule) => schedule.weekday),
    );

    for (const scheduleDto of schedules) {
      const existingSchedule = existingByWeekday.get(scheduleDto.weekday);
      const openingTime =
        scheduleDto.attends && scheduleDto.openingTime
          ? scheduleDto.openingTime
          : null;
      const closingTime =
        scheduleDto.attends && scheduleDto.closingTime
          ? scheduleDto.closingTime
          : null;

      if (existingSchedule) {
        existingSchedule.attends = scheduleDto.attends;
        existingSchedule.openingTime = openingTime;
        existingSchedule.closingTime = closingTime;
        await scheduleRepository.save(existingSchedule);
        continue;
      }

      await scheduleRepository.save(
        scheduleRepository.create({
          recyclingCenterId,
          weekday: scheduleDto.weekday,
          attends: scheduleDto.attends,
          openingTime,
          closingTime,
        }),
      );
    }

    const schedulesToRemove = existingSchedules.filter(
      (schedule) => !incomingWeekdays.has(schedule.weekday),
    );

    if (schedulesToRemove.length > 0) {
      await scheduleRepository.remove(schedulesToRemove);
    }
  }

  private async syncValidatorAssignments(
    manager: DataSource['manager'],
    recyclingCenterId: string,
    validatorUserIds: string[],
  ) {
    const uniqueValidatorUserIds = Array.from(new Set(validatorUserIds));

    if (uniqueValidatorUserIds.length === 0) {
      await manager
        .getRepository(UserRecyclingCenterEntity)
        .update({ recyclingCenterId, isActive: true }, { isActive: false });
      return;
    }

    const validators = await manager.getRepository(UserEntity).find({
      where: {
        userId: In(uniqueValidatorUserIds),
        role: UserRoleEnum.VALIDADOR,
      },
    });

    if (validators.length !== uniqueValidatorUserIds.length) {
      throw new BadRequestException(
        'Uno o mas usuarios asignados no son validadores validos',
      );
    }

    const assignmentRepository = manager.getRepository(
      UserRecyclingCenterEntity,
    );
    const centerAssignments = await assignmentRepository.find({
      where: { recyclingCenterId },
    });
    const centerAssignmentsByUserId = new Map(
      centerAssignments.map((assignment) => [assignment.userId, assignment]),
    );

    await assignmentRepository.update(
      {
        recyclingCenterId,
        isActive: true,
      },
      { isActive: false },
    );

    await assignmentRepository
      .createQueryBuilder()
      .update(UserRecyclingCenterEntity)
      .set({ isActive: false })
      .where('user_id IN (:...validatorUserIds)', {
        validatorUserIds: uniqueValidatorUserIds,
      })
      .andWhere('recycling_center_id <> :recyclingCenterId', {
        recyclingCenterId,
      })
      .andWhere('is_active = true')
      .execute();

    for (const userId of uniqueValidatorUserIds) {
      const existingAssignment = centerAssignmentsByUserId.get(userId);

      if (existingAssignment) {
        existingAssignment.isActive = true;
        await assignmentRepository.save(existingAssignment);
        continue;
      }

      await assignmentRepository.save(
        assignmentRepository.create({
          recyclingCenterId,
          userId,
          isActive: true,
        }),
      );
    }
  }

  private validateSchedules(schedules: RecyclingCenterScheduleInputDto[]) {
    const uniqueWeekdays = new Set(
      schedules.map((schedule) => schedule.weekday),
    );

    if (uniqueWeekdays.size !== schedules.length) {
      throw new BadRequestException(
        'No puedes repetir dias en el horario del centro',
      );
    }

    for (const schedule of schedules) {
      if (!schedule.attends) {
        continue;
      }

      if (!schedule.openingTime || !schedule.closingTime) {
        throw new BadRequestException(
          `Debes indicar horario de apertura y cierre para ${schedule.weekday}`,
        );
      }

      if (schedule.openingTime >= schedule.closingTime) {
        throw new BadRequestException(
          `La hora de apertura debe ser menor a la de cierre para ${schedule.weekday}`,
        );
      }
    }
  }

  private mapSchedule(schedule: RecyclingCenterScheduleEntity) {
    return {
      id: schedule.scheduleId,
      weekday: schedule.weekday,
      attends: schedule.attends,
      openingTime: schedule.openingTime,
      closingTime: schedule.closingTime,
    };
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

  private getCenterOperationalStatus(
    isActive: boolean,
    validatorCount: number,
  ) {
    if (!isActive) {
      return 'Inactivo';
    }

    if (validatorCount === 0) {
      return 'Sin validador';
    }

    return 'Operativo';
  }

  private getCouponExpiresAt(coupon: CouponEntity) {
    const expiresAt = new Date(coupon.createdAt);
    expiresAt.setDate(expiresAt.getDate() + coupon.validityDays);
    return expiresAt;
  }

  private getCouponStatus(coupon: CouponEntity) {
    if (!coupon.isActive) {
      return 'Inactivo';
    }

    if (this.getCouponExpiresAt(coupon) < new Date()) {
      return 'Expirado';
    }

    if (coupon.stock <= 0) {
      return 'Usado';
    }

    return 'Activo';
  }

  private getWeekdayOrder(weekday: WeekdayEnum) {
    const orderedWeekdays = [
      WeekdayEnum.LUNES,
      WeekdayEnum.MARTES,
      WeekdayEnum.MIERCOLES,
      WeekdayEnum.JUEVES,
      WeekdayEnum.VIERNES,
      WeekdayEnum.SABADO,
      WeekdayEnum.DOMINGO,
    ];

    return orderedWeekdays.indexOf(weekday);
  }

  private normalizeNullable(value?: string | null) {
    const normalized = value?.trim() ?? '';
    return normalized.length > 0 ? normalized : null;
  }

  private isUniqueViolation(error: unknown) {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === '23505',
    );
  }
}
