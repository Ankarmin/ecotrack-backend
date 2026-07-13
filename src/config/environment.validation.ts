import { plainToInstance, Type } from 'class-transformer';
import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3001;

  @IsString()
  DATABASE_PUBLIC_URL!: string;

  @IsOptional()
  @IsBooleanString()
  DATABASE_SSL = 'false';

  @IsOptional()
  @IsBooleanString()
  DATABASE_SYNCHRONIZE = 'false';

  @IsOptional()
  @IsBooleanString()
  DATABASE_DROP_SCHEMA = 'false';

  @IsString()
  @MinLength(16)
  JWT_SECRET!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  JWT_EXPIRES_IN = 604800;

  @IsOptional()
  @IsString()
  CORS_ORIGINS = 'http://localhost:3000';

  @IsOptional()
  @IsString()
  APP_PUBLIC_URL = 'http://localhost:3001';
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join(', ');

    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  return validatedConfig;
}
