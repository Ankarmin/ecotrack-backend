import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

import { trimString } from '../../common/transforms/string.transforms';

export class RedeemCouponDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  couponId: string;
}
