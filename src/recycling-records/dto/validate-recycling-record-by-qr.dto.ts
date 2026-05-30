import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';

import { trimString } from '../../common/transforms/string.transforms';
import { ValidateRecyclingRecordDto } from './validate-recycling-record.dto';

export class ValidateRecyclingRecordByQrDto extends ValidateRecyclingRecordDto {
  @Transform(trimString)
  @IsString()
  qrCode: string;
}
