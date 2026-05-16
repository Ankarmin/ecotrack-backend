import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getJwtSecret } from '../config/env';
import { RewardRedemptionEntity } from '../database/entities/reward-redemption.entity';
import { UserEntity } from '../database/entities/user.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PasswordService } from './password.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, WalletEntity, RewardRedemptionEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const configuredExpiration = Number(
          configService.get<string>('JWT_EXPIRES_IN_SECONDS'),
        );

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
  providers: [AuthService, PasswordService, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
