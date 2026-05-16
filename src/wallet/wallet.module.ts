import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { RewardRedemptionEntity } from '../database/entities/reward-redemption.entity';
import { RewardEntity } from '../database/entities/reward.entity';
import { WalletEntity } from '../database/entities/wallet.entity';
import { RewardSeederService } from './reward-seeder.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletEntity, RewardEntity, RewardRedemptionEntity]),
    AuthModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, RewardSeederService],
})
export class WalletModule {}
