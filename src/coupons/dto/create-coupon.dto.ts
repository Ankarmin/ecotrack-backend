import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { trimString } from '../../common/transforms/string.transforms';

export class CreateCouponDto {
  @Transform(trimString)
  @IsString()
  @MaxLength(150)
  title: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  requiredPoints: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  validityDays?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
