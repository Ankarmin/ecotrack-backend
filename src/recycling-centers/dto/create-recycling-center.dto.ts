import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { trimString } from '../../common/transforms/string.transforms';

export class CreateRecyclingCenterDto {
  @Transform(trimString)
  @IsString()
  @MaxLength(150)
  name: string;

  @Transform(trimString)
  @IsString()
  @MaxLength(200)
  address: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  district?: string;
}
