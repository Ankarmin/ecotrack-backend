import { Transform, Type } from 'class-transformer';
import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

import { trimString } from '../../common/transforms/string.transforms';

export class CreateRecyclingRecordDto {
  @IsUUID()
  materialId: string;

  @IsUUID()
  recyclingCenterId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  weightKg: number;

  @Transform(trimString)
  @IsString()
  qrCode: string;
}
