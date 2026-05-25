import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { trimString } from '../../common/transforms/string.transforms';

export class CreateMaterialDto {
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  name: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  co2PerKg: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pointsPerKg: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
