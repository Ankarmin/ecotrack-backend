import { ConfigService } from '@nestjs/config';

const defaultCorsOrigins = [
  'http://localhost:3000',
  'https://ecotrack-frontend-beta.vercel.app',
  'https://*.vercel.app',
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
    return buildDatabaseUrl({ host, port, database, user, password });
  }

  const fallbackConfig = pickDatabaseConfig(configService, [
    {
      host: 'DATABASE_HOST',
      port: 'DATABASE_PORT',
      database: 'DATABASE_NAME',
      user: 'DATABASE_USER',
      password: 'DATABASE_PASSWORD',
    },
    {
      host: 'DB_HOST',
      port: 'DB_PORT',
      database: 'DB_NAME',
      user: 'DB_USER',
      password: 'DB_PASSWORD',
    },
    {
      host: 'POSTGRES_HOST',
      port: 'POSTGRES_PORT',
      database: 'POSTGRES_DB',
      user: 'POSTGRES_USER',
      password: 'POSTGRES_PASSWORD',
    },
  ]);

  if (fallbackConfig) {
    return buildDatabaseUrl(fallbackConfig);
  }

  throw new Error(
    'A PostgreSQL connection is required. Set DATABASE_URL, DATABASE_PUBLIC_URL, DATABASE_PRIVATE_URL, POSTGRES_URL, or provide PGHOST, PGPORT, PGDATABASE, PGUSER and PGPASSWORD.',
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

export function isOriginAllowed(origin: string, allowedOrigins: string[]) {
  return allowedOrigins.some((allowedOrigin) => matchesOrigin(origin, allowedOrigin));
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

function buildDatabaseUrl(config: {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
}) {
  const encodedUser = encodeURIComponent(config.user);
  const encodedPassword = encodeURIComponent(config.password);
  const encodedDatabase = encodeURIComponent(config.database);

  return `postgresql://${encodedUser}:${encodedPassword}@${config.host}:${config.port}/${encodedDatabase}`;
}

function pickDatabaseConfig(
  configService: ConfigService,
  candidates: Array<{
    host: string;
    port: string;
    database: string;
    user: string;
    password: string;
  }>,
) {
  for (const candidate of candidates) {
    const host = configService.get<string>(candidate.host)?.trim();
    const port = configService.get<string>(candidate.port)?.trim();
    const database = configService.get<string>(candidate.database)?.trim();
    const user = configService.get<string>(candidate.user)?.trim();
    const password = configService.get<string>(candidate.password)?.trim();

    if (host && port && database && user && password) {
      return { host, port, database, user, password };
    }
  }

  return null;
}
