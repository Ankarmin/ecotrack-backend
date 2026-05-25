import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

import { normalizeEmail } from '../../common/transforms/string.transforms';

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
