import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRecyclingCenterDto } from './dto/create-recycling-center.dto';
import { RecyclingCentersService } from './recycling-centers.service';

@Controller('recycling-centers')
export class RecyclingCentersController {
  constructor(
    private readonly recyclingCentersService: RecyclingCentersService,
  ) {}

  @Get()
  findAll() {
    return this.recyclingCentersService.findAll();
  }

  @Get(':recyclingCenterId')
  findOne(@Param('recyclingCenterId') recyclingCenterId: string) {
    return this.recyclingCentersService.findOne(recyclingCenterId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createRecyclingCenterDto: CreateRecyclingCenterDto) {
    return this.recyclingCentersService.create(createRecyclingCenterDto);
  }
}
