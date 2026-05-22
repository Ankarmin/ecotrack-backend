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

function buildLocalDatabaseUrl(configService: ConfigService): string | null {
  const host = configService.get<string>('POSTGRES_HOST');
  const port = configService.get<string>('POSTGRES_PORT');
  const database = configService.get<string>('POSTGRES_DB');
  const user = configService.get<string>('POSTGRES_USER');
  const password = configService.get<string>('POSTGRES_PASSWORD');

  if (!host || !port || !database || !user || !password) {
    return null;
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

function hasRailwayRuntime(configService: ConfigService): boolean {
  return Boolean(
    configService.get<string>('RAILWAY_ENVIRONMENT') ||
      configService.get<string>('RAILWAY_ENVIRONMENT_ID') ||
      configService.get<string>('RAILWAY_PROJECT_ID') ||
      configService.get<string>('RAILWAY_SERVICE_ID'),
  );
}

function resolveRailwayDatabaseUrl(configService: ConfigService): string | null {
  return (
    configService.get<string>('DATABASE_URL') ||
    configService.get<string>('DATABASE_PUBLIC_URL') ||
    null
  );
}

function resolveDatabaseUrl(configService: ConfigService): string {
  const databaseTarget = configService.get<string>('DATABASE_TARGET', 'auto');
  const railwayDatabaseUrl = resolveRailwayDatabaseUrl(configService);
  const localDatabaseUrl = buildLocalDatabaseUrl(configService);

  if (databaseTarget === 'railway') {
    return railwayDatabaseUrl ?? '';
  }

  if (databaseTarget === 'local') {
    return localDatabaseUrl ?? '';
  }

  if (hasRailwayRuntime(configService) && railwayDatabaseUrl) {
    return railwayDatabaseUrl;
  }

  return localDatabaseUrl || railwayDatabaseUrl || '';
}

function isSslEnabled(configService: ConfigService): boolean {
  return configService.get<string>('DATABASE_SSL', 'false') === 'true';
}

export const typeOrmModuleOptions: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    url: resolveDatabaseUrl(configService),
    entities: databaseEntities,
    synchronize: false,
    ssl: isSslEnabled(configService)
      ? {
          rejectUnauthorized: false,
        }
      : false,
  }),
};
