import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { CouponRedemptionEntity } from '../coupons/entities/coupon-redemption.entity';
import { CouponEntity } from '../coupons/entities/coupon.entity';
import { RecyclingValidationEntity } from '../recycling-records/entities/recycling-validation.entity';
import { WalletMovementDetailEntity } from './entities/wallet-movement-detail.entity';
import { WalletMovementEntity } from './entities/wallet-movement.entity';
import { WalletEntity } from './entities/wallet.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WalletEntity,
      CouponEntity,
      CouponRedemptionEntity,
      RecyclingValidationEntity,
      WalletMovementEntity,
      WalletMovementDetailEntity,
    ]),
    AuthModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}
