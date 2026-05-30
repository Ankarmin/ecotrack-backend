import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { CouponRedemptionEntity } from '../coupons/entities/coupon-redemption.entity';
import { CouponEntity } from '../coupons/entities/coupon.entity';
import { MaterialEntity } from '../materials/entities/material.entity';
import { RecyclingCenterEntity } from '../recycling-centers/entities/recycling-center.entity';
import { RecyclingCenterScheduleEntity } from '../recycling-centers/entities/recycling-center-schedule.entity';
import { UserRecyclingCenterEntity } from '../recycling-centers/entities/user-recycling-center.entity';
import { RecyclingRecordEntity } from '../recycling-records/entities/recycling-record.entity';
import { RecyclingValidationEntity } from '../recycling-records/entities/recycling-validation.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CouponEntity,
      CouponRedemptionEntity,
      MaterialEntity,
      RecyclingCenterEntity,
      RecyclingCenterScheduleEntity,
      UserRecyclingCenterEntity,
      RecyclingRecordEntity,
      RecyclingValidationEntity,
      UserEntity,
    ]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
