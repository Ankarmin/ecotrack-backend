# EcoTrack Backend

Backend principal de EcoTrack construido con `NestJS`, `TypeORM` y `PostgreSQL`.

## Estado actual

Capacidades backend actualmente presentes:

- autenticación con JWT
- registro e inicio de sesión
- wallet
- catalogo de recompensas
- canje de recompensas

## Stack

- Node.js 18+
- pnpm 9
- NestJS 11
- TypeORM
- PostgreSQL 16
- Docker Compose

## Estructura

```text
.
|- src/
|- test/
|- .env
|- .env.example
|- docker-compose.yaml
|- package.json
\- README.md
```

## Regla operativa

Todos los comandos del proyecto deben ejecutarse desde la raiz del repositorio.

## Requisitos

- Node.js `>= 18`
- pnpm `9.x`
- Docker Desktop si vas a usar contenedores

## Instalación

```bash
pnpm install
```

## Variables de entorno

Archivo plantilla:

```bash
.env.example
```

Archivo local esperado:

```bash
.env
```

Variables principales usadas hoy:

- `DATABASE_TARGET`
- `PORT`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_SSL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGINS`
- `APP_PUBLIC_URL`

Configuración local actual de `.env`:

```bash
DATABASE_TARGET=local

DATABASE_URL=
DATABASE_PUBLIC_URL=

PORT=3001
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
POSTGRES_DB=ecotrack
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
DATABASE_SSL=false
JWT_SECRET=ecotrack-local-jwt-secret-change-this-before-production
JWT_EXPIRES_IN=604800
CORS_ORIGINS=http://localhost:3000,https://ecotrack-frontend-beta.vercel.app,https://*.vercel.app
APP_PUBLIC_URL=http://localhost:${PORT}
```

## Formas de uso

### Opción 1: Base de datos en Docker, API local

Levantar PostgreSQL en Docker:

```bash
pnpm run docker:db
```

Ver logs de la base de datos:

```bash
pnpm run docker:logs
```

Apagar la base de datos:

```bash
pnpm run docker:db:down
```

Con la base de datos corriendo, levantar la API en modo desarrollo:

```bash
pnpm run dev
```

URLs esperadas:

```text
API: http://localhost:3001
Postgres: postgresql://postgres:password@localhost:5434/ecotrack
```

### Opción 2: Backend local sin Docker

Solo tiene sentido si ya tienes un PostgreSQL accesible con los valores de `POSTGRES_*` del `.env`.

Modo desarrollo:

```bash
pnpm run dev
```

Modo normal:

```bash
pnpm run start
```

Modo debug:

```bash
pnpm run start:debug
```

## Docker

- `docker-compose.yaml`

Docker Compose levanta unicamente la base de datos PostgreSQL:

- publica Postgres en `localhost:5434`
- persiste los datos en un volumen `postgres_data`

## Scripts

### Generales

```bash
pnpm run dev
pnpm run start
pnpm run start:dev
pnpm run start:debug
pnpm run start:prod
pnpm run build
pnpm run check-types
pnpm run format
pnpm run format:check
pnpm run lint
pnpm run lint:fix
pnpm run lint:check
```

### Tests

```bash
pnpm run test
pnpm run test:ci
pnpm run test:watch
pnpm run test:cov
pnpm run test:debug
pnpm run test:e2e
```

### Docker

```bash
pnpm run docker:db
pnpm run docker:db:down
pnpm run docker:logs
```

## Base de datos

- Motor: PostgreSQL 16
- Contenedor: `db`
- Puerto host: `5434`
- Puerto interno del contenedor: `5432`

Cuando usas Docker Compose, la base de datos esta disponible en `localhost:5434`.

### Conexion desde TablePlus

```text
postgresql://postgres:password@localhost:5434/ecotrack
```

Campos equivalentes:

- Host: `localhost`
- Port: `5434`
- Database: `ecotrack`
- User: `postgres`
- Password: `password`
