import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateRecyclingRecordDto } from './dto/create-recycling-record.dto';
import { ValidateRecyclingRecordDto } from './dto/validate-recycling-record.dto';
import { RecyclingRecordsService } from './recycling-records.service';

@UseGuards(JwtAuthGuard)
@Controller('recycling-records')
export class RecyclingRecordsController {
  constructor(
    private readonly recyclingRecordsService: RecyclingRecordsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createRecyclingRecordDto: CreateRecyclingRecordDto,
  ) {
    return this.recyclingRecordsService.create(user, createRecyclingRecordDto);
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.recyclingRecordsService.findMine(user.userId);
  }

  @Get(':recyclingRecordId')
  findOne(
    @Param('recyclingRecordId') recyclingRecordId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recyclingRecordsService.findOne(recyclingRecordId, user);
  }

  @Patch(':recyclingRecordId/validate')
  validate(
    @Param('recyclingRecordId') recyclingRecordId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() validateDto: ValidateRecyclingRecordDto,
  ) {
    return this.recyclingRecordsService.validateRecord(
      recyclingRecordId,
      user,
      validateDto,
    );
  }
}
