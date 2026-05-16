import { ConfigService } from '@nestjs/config';

const defaultCorsOrigins = [
  'http://localhost:3000',
  'https://ecotrack-frontend-beta.vercel.app',
];

export function isTestEnvironment() {
  return process.env.NODE_ENV === 'test';
}

export function shouldUseSsl(databaseUrl: string) {
  const normalizedUrl = databaseUrl.toLowerCase();

  return (
    !normalizedUrl.includes('localhost') &&
    !normalizedUrl.includes('127.0.0.1') &&
    !normalizedUrl.includes('sslmode=disable')
  );
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
