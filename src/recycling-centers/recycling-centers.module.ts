import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminGuard } from '../admin/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { RecyclingRecordsModule } from '../recycling-records/recycling-records.module';
import { RecyclingRecordEntity } from '../recycling-records/entities/recycling-record.entity';
import { RecyclingCenterEntity } from './entities/recycling-center.entity';
import { RecyclingCenterScheduleEntity } from './entities/recycling-center-schedule.entity';
import { UserRecyclingCenterEntity } from './entities/user-recycling-center.entity';
import { RecyclingCentersController } from './recycling-centers.controller';
import { RecyclingCentersService } from './recycling-centers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecyclingCenterEntity,
      RecyclingCenterScheduleEntity,
      UserRecyclingCenterEntity,
      RecyclingRecordEntity,
    ]),
    AuthModule,
    RecyclingRecordsModule,
  ],
  controllers: [RecyclingCentersController],
  providers: [RecyclingCentersService, AdminGuard],
  exports: [RecyclingCentersService],
})
export class RecyclingCentersModule {}
