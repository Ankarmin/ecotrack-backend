import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

import { trimString } from '../../common/transforms/string.transforms';
import { WeekdayEnum } from '../../database/database.enums';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class RecyclingCenterScheduleInputDto {
  @IsEnum(WeekdayEnum)
  weekday: WeekdayEnum;

  @IsBoolean()
  attends: boolean;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Matches(TIME_PATTERN)
  openingTime?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @Matches(TIME_PATTERN)
  closingTime?: string;
}
