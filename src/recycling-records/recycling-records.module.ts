import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../users/entities/user.entity';
import { MaterialEntity } from '../materials/entities/material.entity';
import { RecyclingCenterEntity } from '../recycling-centers/entities/recycling-center.entity';
import { UserRecyclingCenterEntity } from '../recycling-centers/entities/user-recycling-center.entity';
import { RecyclingRecordEntity } from './entities/recycling-record.entity';
import { RecyclingValidationEntity } from './entities/recycling-validation.entity';
import { WalletMovementDetailEntity } from '../wallet/entities/wallet-movement-detail.entity';
import { WalletMovementEntity } from '../wallet/entities/wallet-movement.entity';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import { RecyclingRecordsController } from './recycling-records.controller';
import { RecyclingRecordsService } from './recycling-records.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecyclingRecordEntity,
      MaterialEntity,
      RecyclingCenterEntity,
      UserRecyclingCenterEntity,
      RecyclingValidationEntity,
      UserEntity,
      WalletEntity,
      WalletMovementEntity,
      WalletMovementDetailEntity,
    ]),
    AuthModule,
  ],
  controllers: [RecyclingRecordsController],
  providers: [RecyclingRecordsService],
  exports: [RecyclingRecordsService],
})
export class RecyclingRecordsModule {}
