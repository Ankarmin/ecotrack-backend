import { ConfigService } from '@nestjs/config';

const defaultCorsOrigins = [
  'http://localhost:3000',
  'https://ecotrack-frontend-beta.vercel.app',
  'https://*.vercel.app',
];

export function isTestEnvironment() {
  return process.env.NODE_ENV === 'test';
}

export function getJwtExpiresIn(configService: ConfigService) {
  const configuredExpiration = readConfigValue(configService, 'JWT_EXPIRES_IN');

  if (configuredExpiration) {
    return configuredExpiration;
  }

  return readConfigValue(configService, 'JWT_EXPIRES_IN_SECONDS');
}

export function getJwtSecret(configService: ConfigService) {
  const secret = configService.get<string>('JWT_SECRET');

  if (secret) {
    return secret;
  }

  if (isTestEnvironment()) {
    return 'test-secret';
  }

  throw new Error('JWT_SECRET is required');
}

export function getCorsOrigins(configService: ConfigService) {
  const configuredOrigins = configService.get<string>('CORS_ORIGINS');

  if (!configuredOrigins) {
    return defaultCorsOrigins;
  }

  const origins = configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : defaultCorsOrigins;
}

export function isOriginAllowed(origin: string, allowedOrigins: string[]) {
  return allowedOrigins.some((allowedOrigin) =>
    matchesOrigin(origin, allowedOrigin),
  );
}

function matchesOrigin(origin: string, allowedOrigin: string) {
  if (allowedOrigin === origin) {
    return true;
  }

  if (!allowedOrigin.includes('*')) {
    return false;
  }

  const escapedPattern = allowedOrigin
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escapedPattern}$`).test(origin);
}

function readConfigValue(configService: ConfigService, key: string) {
  const value = configService.get<string | number>(key);

  if (typeof value === 'number') {
    return String(value);
  }

  return value?.trim();
}
