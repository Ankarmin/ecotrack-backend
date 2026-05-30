import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminGuard } from '../admin/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { CouponEntity } from './entities/coupon.entity';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  imports: [TypeOrmModule.forFeature([CouponEntity]), AuthModule],
  controllers: [CouponsController],
  providers: [CouponsService, AdminGuard],
  exports: [CouponsService],
})
export class CouponsModule {}
