# Evidencia de Funcionamiento SOA y Aplicacion de RNF en EcoTrack

## 1. Objetivo

Documentar, con base en el proyecto EcoTrack, la evidencia de funcionamiento de una aplicacion bajo enfoque SOA y la aplicacion de tacticas de arquitectura para dos requisitos no funcionales relevantes.

## 2. Alcance

- Backend: `C:\Proyectos\ecotrack-backend`
- Frontend: `C:\Proyectos\ecotrack-frontend`
- Estilo: aplicacion web code-first con API REST.

## 3. Conclusion Ejecutiva

EcoTrack evidencia un enfoque SOA a nivel de servicios de negocio porque separa capacidades funcionales en contratos HTTP claros consumidos por un cliente independiente.

La solucion actual no es una malla de microservicios desplegados de forma independiente. Funciona como un monolito modular orientado a servicios en el backend, consumido por un frontend desacoplado.

Los RNF evaluados son:

1. Seguridad.
2. Confiabilidad e integridad transaccional.

## 4. Evidencia de Arquitectura Orientada a Servicios

### 4.1 Proveedor y Consumidor

- El backend NestJS expone servicios REST por dominio funcional en `src/app.module.ts`.
- El frontend Next.js consume esos servicios desde `C:\Proyectos\ecotrack-frontend\lib\api.ts`.
- La funcion `request<T>()` centraliza URL base, headers, token Bearer y manejo de errores.

### 4.2 Servicios Identificados

| Servicio | Responsabilidad | Evidencia backend | Evidencia frontend |
| --- | --- | --- | --- |
| Auth | Registro, login y perfil actual | `src/auth/auth.controller.ts` | `lib/api.ts`, `app/(auth)/auth/login/page.tsx` |
| Users | Perfil y ranking semanal | `src/users/users.controller.ts` | `app/(app)/dashboard/page.tsx` |
| Materials | Catalogo de materiales reciclables | `src/materials/materials.controller.ts` | `app/(app)/dashboard/recycle/page.tsx` |
| Recycling Centers | Centros y operacion de validador | `src/recycling-centers/recycling-centers.controller.ts` | `lib/api.ts` |
| Recycling Records | Registro, historial y validacion | `src/recycling-records/recycling-records.controller.ts` | `app/(app)/dashboard/recycle/page.tsx` |
| Wallet | Puntos, cupones y canjes | `src/wallet/wallet.controller.ts` | `app/(app)/gamification/wallet/page.tsx` |
| Admin | Dashboard y gestion operativa | `src/admin/admin.controller.ts` | rutas `/admin` del frontend |

### 4.3 Flujo SOA: Inicio de Sesion

1. El usuario ingresa credenciales en el frontend.
2. El frontend llama `loginUser()`.
3. El backend recibe `POST /auth/login`.
4. `AuthService` valida credenciales y emite un JWT.
5. El frontend guarda el token y redirige segun el rol.

### 4.4 Flujo SOA: Registro de Reciclaje

1. El frontend consulta materiales y centros de reciclaje.
2. El usuario selecciona material, peso y centro.
3. El frontend llama `POST /recycling-records`.
4. El backend calcula CO2 evitado y EcoPuntos.
5. El sistema genera un registro pendiente de validacion.

### 4.5 Flujo SOA: Validacion y Puntos

1. El validador consulta registros de su centro.
2. El validador aprueba o rechaza un registro.
3. El backend actualiza el estado del reciclaje.
4. Si se valida, se registran EcoPuntos en la wallet del usuario.

### 4.6 Flujo SOA: Canje de Recompensas

1. El cliente consulta su wallet.
2. El cliente selecciona un cupon.
3. El frontend llama `POST /wallet/redeem`.
4. El backend descuenta puntos, reduce stock y registra la redencion.

### 4.7 Diagrama Simplificado

```text
Usuario
  |
  v
Frontend Next.js
  |
  +--> /auth
  +--> /users
  +--> /materials
  +--> /recycling-centers
  +--> /recycling-records
  +--> /wallet
  +--> /admin
  |
  v
Backend NestJS
  |
  v
PostgreSQL
```

## 5. RNF 1: Seguridad

### RNF

La aplicacion debe proteger datos personales, operaciones de reciclaje, wallet y recompensas, evitando accesos no autorizados.

### Tacticas Aplicadas

1. Autenticacion por JWT.
2. Autorizacion por rol mediante guards.
3. Validacion estricta de entrada.
4. Restriccion de origenes por CORS.

### Evidencia

- `src/auth/jwt-auth.guard.ts` valida token Bearer y rechaza tokens invalidos o expirados.
- `src/admin/admin.controller.ts` protege el modulo administrativo con `JwtAuthGuard` y `AdminGuard`.
- `src/wallet/wallet.controller.ts` protege la wallet con `JwtAuthGuard` y `ClientGuard`.
- `src/main.ts` activa CORS controlado y `ValidationPipe` global.
- `src/config/environment.validation.ts` valida variables sensibles como `JWT_SECRET`.

### Resultado

Estas tacticas reducen el riesgo de acceso no autorizado, uso indebido de roles, envio de campos no permitidos y consumo desde origenes no autorizados.

## 6. RNF 2: Confiabilidad e Integridad Transaccional

### RNF

La aplicacion debe garantizar consistencia en operaciones criticas como validacion de reciclajes, asignacion de EcoPuntos y canje de cupones.

### Tacticas Aplicadas

1. Transacciones para operaciones compuestas.
2. Bloqueo pesimista en recursos criticos.
3. Validacion de precondiciones antes de confirmar cambios.

### Evidencia

- `src/auth/auth.service.ts` crea usuario y wallet en una sola transaccion.
- `src/wallet/wallet.service.ts` ejecuta el canje en transaccion y bloquea cupon y wallet con `pessimistic_write`.
- `src/recycling-records/recycling-records.service.ts` valida reciclajes en transaccion y suma EcoPuntos de forma consistente.
- `src/recycling-records/recycling-records.service.ts` evita reprocesar registros ya atendidos.
- `src/recycling-records/recycling-records.service.ts` evita QR duplicados.

### Resultado

Estas tacticas mitigan doble canje, decremento incorrecto de stock, asignacion duplicada de puntos, doble validacion e inconsistencias entre wallet, movimientos y redenciones.

## 7. Verificacion Tecnica

Se ejecuto compilacion de ambos proyectos:

1. Backend: `pnpm build` en `C:\Proyectos\ecotrack-backend`.
2. Frontend: `pnpm build` en `C:\Proyectos\ecotrack-frontend`.

Resultado: ambos proyectos compilaron correctamente.

## 8. Conclusiones

EcoTrack evidencia funcionamiento bajo un enfoque SOA porque organiza la aplicacion alrededor de servicios de negocio expuestos por API REST y consumidos por un frontend independiente.

El proyecto aplica tacticas concretas para dos RNF relevantes:

1. Seguridad, mediante JWT, guards, validacion de entrada y CORS.
2. Confiabilidad, mediante transacciones, bloqueos pesimistas y validaciones de estado.
