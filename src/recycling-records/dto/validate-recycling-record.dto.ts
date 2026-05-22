import { IsEnum } from 'class-validator';

import { RecyclingRecordStatusEnum } from '../../database/database.enums';

export class ValidateRecyclingRecordDto {
  @IsEnum(RecyclingRecordStatusEnum)
  status: RecyclingRecordStatusEnum.VALIDADO | RecyclingRecordStatusEnum.RECHAZADO;
}
