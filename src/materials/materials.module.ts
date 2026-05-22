import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MaterialEntity } from './entities/material.entity';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

@Module({
  imports: [TypeOrmModule.forFeature([MaterialEntity]), AuthModule],
  controllers: [MaterialsController],
  providers: [MaterialsService, JwtAuthGuard],
  exports: [MaterialsService],
})
export class MaterialsModule {}
