import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { trimString } from '../../common/transforms/string.transforms';
import { RecyclingRecordStatusEnum } from '../../database/database.enums';

export class FindValidatorRecyclingRecordsDto {
  @IsOptional()
  @IsEnum(RecyclingRecordStatusEnum)
  status?: RecyclingRecordStatusEnum;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  search?: string;
}
