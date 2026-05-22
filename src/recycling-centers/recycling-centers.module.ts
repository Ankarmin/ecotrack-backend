import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecyclingCenterEntity } from './entities/recycling-center.entity';
import { RecyclingCenterScheduleEntity } from './entities/recycling-center-schedule.entity';
import { RecyclingCentersController } from './recycling-centers.controller';
import { RecyclingCentersService } from './recycling-centers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecyclingCenterEntity, RecyclingCenterScheduleEntity]),
    AuthModule,
  ],
  controllers: [RecyclingCentersController],
  providers: [RecyclingCentersService, JwtAuthGuard],
  exports: [RecyclingCentersService],
})
export class RecyclingCentersModule {}
