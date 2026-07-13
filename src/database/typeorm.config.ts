import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

import { CouponRedemptionEntity } from '../coupons/entities/coupon-redemption.entity';
import { CouponEntity } from '../coupons/entities/coupon.entity';
import { MaterialEntity } from '../materials/entities/material.entity';
import { RecyclingCenterScheduleEntity } from '../recycling-centers/entities/recycling-center-schedule.entity';
import { RecyclingCenterEntity } from '../recycling-centers/entities/recycling-center.entity';
import { UserRecyclingCenterEntity } from '../recycling-centers/entities/user-recycling-center.entity';
import { RecyclingRecordEntity } from '../recycling-records/entities/recycling-record.entity';
import { RecyclingValidationEntity } from '../recycling-records/entities/recycling-validation.entity';
import { UserEntity } from '../users/entities/user.entity';
import { WalletMovementDetailEntity } from '../wallet/entities/wallet-movement-detail.entity';
import { WalletMovementEntity } from '../wallet/entities/wallet-movement.entity';
import { WalletEntity } from '../wallet/entities/wallet.entity';

const databaseEntities = [
  UserEntity,
  WalletEntity,
  MaterialEntity,
  RecyclingCenterEntity,
  RecyclingCenterScheduleEntity,
  UserRecyclingCenterEntity,
  RecyclingRecordEntity,
  RecyclingValidationEntity,
  CouponEntity,
  CouponRedemptionEntity,
  WalletMovementEntity,
  WalletMovementDetailEntity,
];

function resolveDatabaseUrl(configService: ConfigService): string {
  return configService.get<string>('DATABASE_PUBLIC_URL', '');
}

function isSslEnabled(configService: ConfigService): boolean {
  return configService.get<string>('DATABASE_SSL', 'false') === 'true';
}

function isSynchronizeEnabled(configService: ConfigService): boolean {
  return configService.get<string>('DATABASE_SYNCHRONIZE', 'false') === 'true';
}

function isDropSchemaEnabled(configService: ConfigService): boolean {
  return configService.get<string>('DATABASE_DROP_SCHEMA', 'false') === 'true';
}

export const typeOrmModuleOptions: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    url: resolveDatabaseUrl(configService),
    entities: databaseEntities,
    synchronize: isSynchronizeEnabled(configService),
    dropSchema: isDropSchemaEnabled(configService),
    ssl: isSslEnabled(configService)
      ? {
          rejectUnauthorized: false,
        }
      : false,
  }),
};
