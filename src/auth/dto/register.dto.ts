import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

import {
  normalizeEmail,
  trimString,
} from '../../common/transforms/string.transforms';

export class RegisterDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstNames: string;

  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastNames: string;

  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  @Transform(trimString)
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  @Matches(/^[0-9+\-\s()]+$/)
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;
}
