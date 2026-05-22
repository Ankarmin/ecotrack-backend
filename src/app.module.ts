import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CouponsModule } from './coupons/coupons.module';
import { validateEnvironment } from './config/environment.validation';
import { typeOrmModuleOptions } from './database/typeorm.config';
import { MaterialsModule } from './materials/materials.module';
import { RecyclingCentersModule } from './recycling-centers/recycling-centers.module';
import { RecyclingRecordsModule } from './recycling-records/recycling-records.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync(typeOrmModuleOptions),
    AuthModule,
    UsersModule,
    MaterialsModule,
    RecyclingCentersModule,
    RecyclingRecordsModule,
    CouponsModule,
    WalletModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
