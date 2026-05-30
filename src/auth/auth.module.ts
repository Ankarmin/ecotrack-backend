import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getJwtExpiresIn, getJwtSecret } from '../config/env';
import { CouponRedemptionEntity } from '../coupons/entities/coupon-redemption.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ClientGuard } from './client.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordService } from './password.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      WalletEntity,
      CouponRedemptionEntity,
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const configuredExpiration = Number(getJwtExpiresIn(configService));

        return {
          secret: getJwtSecret(configService),
          signOptions: {
            expiresIn: Number.isFinite(configuredExpiration)
              ? configuredExpiration
              : 60 * 60 * 24 * 7,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, JwtAuthGuard, ClientGuard],
  exports: [JwtAuthGuard, ClientGuard, JwtModule, PasswordService],
})
export class AuthModule {}
