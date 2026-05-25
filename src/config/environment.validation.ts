import { plainToInstance, Type } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum DatabaseTarget {
  Auto = 'auto',
  Local = 'local',
  Railway = 'railway',
}

class EnvironmentVariables {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3001;

  @IsOptional()
  @IsEnum(DatabaseTarget)
  DATABASE_TARGET: DatabaseTarget = DatabaseTarget.Auto;

  @IsOptional()
  @IsString()
  DATABASE_PUBLIC_URL?: string;

  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @IsOptional()
  @IsString()
  POSTGRES_HOST?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  POSTGRES_PORT?: number;

  @IsOptional()
  @IsString()
  POSTGRES_DB?: string;

  @IsOptional()
  @IsString()
  POSTGRES_USER?: string;

  @IsOptional()
  @IsString()
  POSTGRES_PASSWORD?: string;

  @IsOptional()
  @IsBooleanString()
  DATABASE_SSL = 'false';

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

  const hasDirectDatabaseUrl = Boolean(
    validatedConfig.DATABASE_PUBLIC_URL?.trim() ||
    validatedConfig.DATABASE_URL?.trim(),
  );
  const hasLocalDatabaseConfig = [
    validatedConfig.POSTGRES_HOST,
    validatedConfig.POSTGRES_PORT,
    validatedConfig.POSTGRES_DB,
    validatedConfig.POSTGRES_USER,
    validatedConfig.POSTGRES_PASSWORD,
  ].every((value) => value !== undefined && `${value}`.trim() !== '');

  if (
    validatedConfig.DATABASE_TARGET === DatabaseTarget.Railway &&
    !hasDirectDatabaseUrl
  ) {
    throw new Error(
      'Invalid environment configuration: DATABASE_PUBLIC_URL o DATABASE_URL es requerido cuando DATABASE_TARGET=railway',
    );
  }

  if (
    validatedConfig.DATABASE_TARGET === DatabaseTarget.Local &&
    !hasLocalDatabaseConfig
  ) {
    throw new Error(
      'Invalid environment configuration: POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER y POSTGRES_PASSWORD son requeridos cuando DATABASE_TARGET=local',
    );
  }

  if (!hasDirectDatabaseUrl && !hasLocalDatabaseConfig) {
    throw new Error(
      'Invalid environment configuration: configura DATABASE_PUBLIC_URL, DATABASE_URL o las variables POSTGRES_*',
    );
  }

  return validatedConfig;
}
