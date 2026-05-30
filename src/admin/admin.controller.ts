import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { CreateAdminCouponDto } from './dto/create-admin-coupon.dto';
import { CreateAdminRecyclingCenterDto } from './dto/create-admin-recycling-center.dto';
import { CreateAdminValidatorDto } from './dto/create-admin-validator.dto';
import { UpdateAdminCouponDto } from './dto/update-admin-coupon.dto';
import { UpdateAdminRecyclingCenterDto } from './dto/update-admin-recycling-center.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('rankings/weekly/recycling-centers')
  getWeeklyCenterRanking() {
    return this.adminService.getWeeklyCenterRanking();
  }

  @Get('validators')
  findValidators() {
    return this.adminService.findValidators();
  }

  @Post('validators')
  createValidator(@Body() createDto: CreateAdminValidatorDto) {
    return this.adminService.createValidator(createDto);
  }

  @Get('recycling-centers')
  findAllCenters() {
    return this.adminService.findAllCenters();
  }

  @Get('recycling-centers/:recyclingCenterId')
  findOneCenter(@Param('recyclingCenterId') recyclingCenterId: string) {
    return this.adminService.findOneCenter(recyclingCenterId);
  }

  @Post('recycling-centers')
  createCenter(@Body() createDto: CreateAdminRecyclingCenterDto) {
    return this.adminService.createCenter(createDto);
  }

  @Patch('recycling-centers/:recyclingCenterId')
  updateCenter(
    @Param('recyclingCenterId') recyclingCenterId: string,
    @Body() updateDto: UpdateAdminRecyclingCenterDto,
  ) {
    return this.adminService.updateCenter(recyclingCenterId, updateDto);
  }

  @Delete('recycling-centers/:recyclingCenterId')
  deactivateCenter(@Param('recyclingCenterId') recyclingCenterId: string) {
    return this.adminService.deactivateCenter(recyclingCenterId);
  }

  @Get('coupons')
  findAllCoupons() {
    return this.adminService.findAllCoupons();
  }

  @Get('coupons/:couponId')
  findOneCoupon(@Param('couponId') couponId: string) {
    return this.adminService.findOneCoupon(couponId);
  }

  @Post('coupons')
  createCoupon(@Body() createDto: CreateAdminCouponDto) {
    return this.adminService.createCoupon(createDto);
  }

  @Patch('coupons/:couponId')
  updateCoupon(
    @Param('couponId') couponId: string,
    @Body() updateDto: UpdateAdminCouponDto,
  ) {
    return this.adminService.updateCoupon(couponId, updateDto);
  }

  @Delete('coupons/:couponId')
  deactivateCoupon(@Param('couponId') couponId: string) {
    return this.adminService.deactivateCoupon(couponId);
  }
}
