import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RedeemRewardDto } from './dto/redeem-reward.dto';
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
  redeemReward(
    @CurrentUser() user: AuthenticatedUser,
    @Body() redeemRewardDto: RedeemRewardDto,
  ) {
    return this.walletService.redeemReward(user.userId, redeemRewardDto.rewardId);
  }
}
