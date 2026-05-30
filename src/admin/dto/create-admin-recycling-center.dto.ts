import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { trimString } from '../../common/transforms/string.transforms';
import { RecyclingCenterScheduleInputDto } from './recycling-center-schedule-input.dto';

export class CreateAdminRecyclingCenterDto {
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

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecyclingCenterScheduleInputDto)
  schedules?: RecyclingCenterScheduleInputDto[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  validatorUserIds?: string[];
}
