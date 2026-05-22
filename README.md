# EcoTrack Backend

Backend principal de EcoTrack construido con `NestJS`, `TypeORM` y `PostgreSQL`.

## Estado actual

Capacidades backend actualmente presentes:

- autenticacion con JWT
- registro e inicio de sesion
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
|- Dockerfile
|- package.json
\- README.md
```

## Regla operativa

Todos los comandos del proyecto deben ejecutarse desde la raiz del repositorio.

## Requisitos

- Node.js `>= 18`
- pnpm `9.x`
- Docker Desktop si vas a usar contenedores

## Instalacion

```bash
pnpm install
```

## Variables de entorno

Archivo plantilla:

```bash
.env.example
```

Plantilla para Railway:

```bash
.env.railway.example
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

Configuracion local actual de `.env`:

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

### Opcion 1: Backend local con Docker

Este es el flujo principal actual de trabajo.

Levantar API + PostgreSQL:

```bash
pnpm run docker:up
```

Levantar en segundo plano:

```bash
pnpm run docker:up:detached
```

Ver logs:

```bash
pnpm run docker:logs
```

Apagar stack:

```bash
pnpm run docker:down
```

URLs esperadas:

```text
API: http://localhost:3001
Postgres: postgresql://postgres:password@localhost:5434/ecotrack
```

### Opcion 2: Backend local sin Docker

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

La infraestructura Docker esta centralizada en la raiz:

- `docker-compose.yaml`
- `Dockerfile`
- `.dockerignore`

Docker Compose hace esto:

- levanta `api`
- levanta `db`
- fuerza `DATABASE_TARGET=local`
- dentro de la red Docker usa `POSTGRES_HOST=db`
- publica la API en `localhost:3001`
- publica Postgres en `localhost:5434`

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
pnpm run docker:up
pnpm run docker:up:detached
pnpm run docker:logs
pnpm run docker:down
```

## Base de datos

- Motor: PostgreSQL 16
- Contenedor: `db`
- Puerto host: `5434`
- Puerto interno del contenedor: `5432`

Cuando usas Docker Compose, el backend se conecta a Postgres dentro de la red interna usando `db:5432`.

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

## Despliegue en Railway

El backend ya esta listo para desplegarse en Railway usando el `Dockerfile` del repositorio.

### Lo importante antes de desplegar

- no hay `synchronize`
- no hay seeds
- no hay migraciones automaticas

Eso significa que la base de datos en Railway debe existir previamente con el esquema correcto.

### Builder esperado

Railway puede usar directamente:

```text
Dockerfile
```

No necesitas cambiar el comando de arranque si Railway detecta el `Dockerfile`.

### Variables recomendadas en Railway

Usa como base:

```bash
.env.railway.example
```

Variables minimas:

```bash
DATABASE_TARGET=auto
DATABASE_URL=
DATABASE_PUBLIC_URL=
PORT=3001
DATABASE_SSL=true
JWT_SECRET=
JWT_EXPIRES_IN=604800
CORS_ORIGINS=
APP_PUBLIC_URL=
```

Notas:

- Railway normalmente inyecta `DATABASE_URL` si conectas un servicio PostgreSQL.
- Si tu base externa entrega otra URL publica, puedes usar `DATABASE_PUBLIC_URL`.
- `JWT_SECRET` debe ser largo y privado.
- `CORS_ORIGINS` debe incluir la URL real de tu frontend desplegado.
- `APP_PUBLIC_URL` debe ser la URL publica final del backend en Railway.

### Flujo recomendado

1. Asegurar que la base PostgreSQL en Railway ya tenga el esquema correcto.
2. Configurar las variables del servicio backend.
3. Conectar el repositorio a Railway.
4. Desplegar usando el `Dockerfile`.
5. Probar el health básico en:

```text
GET /
```

### Endpoints principales desplegados

```text
POST /auth/register
POST /auth/login
GET /auth/me
GET /users/me
GET /materials
GET /recycling-centers
GET /coupons
GET /wallet
POST /wallet/redeem
POST /recycling-records
PATCH /recycling-records/:recyclingRecordId/validate
```
