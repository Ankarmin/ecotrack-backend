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

export function getDatabaseUrl(configService: ConfigService) {
  const directUrlCandidates = [
    'DATABASE_URL',
    'DATABASE_PRIVATE_URL',
    'DATABASE_PUBLIC_URL',
    'POSTGRES_URL',
  ];

  for (const variableName of directUrlCandidates) {
    const value = configService.get<string>(variableName)?.trim();

    if (value) {
      return value;
    }
  }

  const host = configService.get<string>('PGHOST')?.trim();
  const port = configService.get<string>('PGPORT')?.trim();
  const database = configService.get<string>('PGDATABASE')?.trim();
  const user = configService.get<string>('PGUSER')?.trim();
  const password = configService.get<string>('PGPASSWORD')?.trim();

  if (host && port && database && user && password) {
    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    const encodedDatabase = encodeURIComponent(database);

    return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${encodedDatabase}`;
  }

  throw new Error(
    'A PostgreSQL connection is required. Set DATABASE_URL or provide PGHOST, PGPORT, PGDATABASE, PGUSER and PGPASSWORD.',
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
