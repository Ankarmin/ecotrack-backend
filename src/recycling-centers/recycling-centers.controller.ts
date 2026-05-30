import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminGuard } from '../admin/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { FindValidatorRecyclingRecordsDto } from '../recycling-records/dto/find-validator-recycling-records.dto';
import { ValidateRecyclingRecordByQrDto } from '../recycling-records/dto/validate-recycling-record-by-qr.dto';
import { ValidateRecyclingRecordDto } from '../recycling-records/dto/validate-recycling-record.dto';
import { RecyclingRecordsService } from '../recycling-records/recycling-records.service';
import { CreateRecyclingCenterDto } from './dto/create-recycling-center.dto';
import { RecyclingCentersService } from './recycling-centers.service';

@Controller('recycling-centers')
export class RecyclingCentersController {
  constructor(
    private readonly recyclingCentersService: RecyclingCentersService,
    private readonly recyclingRecordsService: RecyclingRecordsService,
  ) {}

  @Get()
  findAll() {
    return this.recyclingCentersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findAssignedCenter(@CurrentUser() user: AuthenticatedUser) {
    return this.recyclingCentersService.findAssignedCenter(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/rankings/weekly/clients')
  getWeeklyClientRanking(@CurrentUser() user: AuthenticatedUser) {
    return this.recyclingCentersService.getWeeklyClientRanking(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/recycling-records')
  findValidatorRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FindValidatorRecyclingRecordsDto,
  ) {
    return this.recyclingRecordsService.findForValidator(user, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/recycling-records/:recyclingRecordId')
  findValidatorRecord(
    @Param('recyclingRecordId') recyclingRecordId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.recyclingRecordsService.findOneForValidator(
      recyclingRecordId,
      user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/recycling-records/:recyclingRecordId/validate')
  validateRecord(
    @Param('recyclingRecordId') recyclingRecordId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() validateDto: ValidateRecyclingRecordDto,
  ) {
    return this.recyclingRecordsService.validateRecordForValidator(
      recyclingRecordId,
      user,
      validateDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/recycling-records/validate-qr')
  validateRecordByQr(
    @CurrentUser() user: AuthenticatedUser,
    @Body() validateDto: ValidateRecyclingRecordByQrDto,
  ) {
    return this.recyclingRecordsService.validateRecordByQr(user, validateDto);
  }

  @Get(':recyclingCenterId')
  findOne(@Param('recyclingCenterId') recyclingCenterId: string) {
    return this.recyclingCentersService.findOne(recyclingCenterId);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() createRecyclingCenterDto: CreateRecyclingCenterDto) {
    return this.recyclingCentersService.create(createRecyclingCenterDto);
  }
}
