import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CouponEntity } from './entities/coupon.entity';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  imports: [TypeOrmModule.forFeature([CouponEntity]), AuthModule],
  controllers: [CouponsController],
  providers: [CouponsService, JwtAuthGuard],
  exports: [CouponsService],
})
export class CouponsModule {}
