import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RedeemCouponDto } from './dto/redeem-coupon.dto';
import { WalletService } from './wallet.service';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.walletService.getWallet(user.userId);
  }

  @Post('redeem')
  redeemCoupon(
    @CurrentUser() user: AuthenticatedUser,
    @Body() redeemCouponDto: RedeemCouponDto,
  ) {
    return this.walletService.redeemCoupon(user.userId, redeemCouponDto.couponId);
  }
}
