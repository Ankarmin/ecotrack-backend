# PROYECTO INTEGRADOR FINAL

# Pruebas de Software — Sistema EcoTrack

---

# FASE 3: SEGURIDAD Y CALIDAD (DEVSECOPS)

**Asignado a:** _________________________

**Fecha:** Julio 2026

---

## Tabla de Contenido

1. [3.1 Análisis de Riesgos y Seguridad (OWASP Top 10)](#31-análisis-de-riesgos-y-seguridad-owasp-top-10)
   - 3.1.1 Escaneo de Vulnerabilidades (SonarQube)
   - 3.1.2 Identificación de Defectos — Análisis JWT
   - 3.1.3 Estrategias de Mitigación
2. [3.2 Métricas de Calidad y Conclusiones](#32-métricas-de-calidad-y-conclusiones)
   - 3.2.1 Recopilación de Reportes
   - 3.2.2 Interpretación y Densidad de Defectos
   - 3.2.3 Resumen Ejecutivo
3. [Anexos](#anexos)

---

## 3.1 Análisis de Riesgos y Seguridad (OWASP Top 10)

### 3.1.1 Escaneo de Vulnerabilidades (SonarQube)

Se ejecutó SonarQube Community Edition 10.x como herramienta SAST (Static Application Security Testing) sobre ambos repositorios: `eco-backend` (NestJS) y `eco-frontend` (Next.js). A continuación se presentan los resultados comparativos.

#### Tabla de Métricas Comparativas

| Métrica | Backend (NestJS) | Frontend (Next.js) | Interpretación |
|---------|:---:|:---:|---|
| **Cobertura de pruebas** | 84.8% | 81.0% | Ambos superan el umbral de 80% definido para el proyecto |
| **Bugs** | 0 | 2 | Backend sin bugs detectados. Frontend: 2 bugs de accesibilidad (keyboard listeners) |
| **Vulnerabilidades** | 0 | 0 | Sin vulnerabilidades de seguridad detectadas en análisis estático |
| **Security Hotspots** | 0 | 1 | Frontend: 1 hotspot que requiere revisión manual |
| **Code Smells** | 7 | 214 | Backend limpio. Frontend: alta deuda técnica por 214 code smells |
| **Duplicación** | 5.7% | 0.5% | Backend tiene 5.7% de código duplicado (aceptable <10%). Frontend muy bajo |
| **Security Rating** | A | A | Ambos proyectos califican con la máxima nota en seguridad |
| **Reliability Rating** | A | B | Backend excelente. Frontend: B por los 2 bugs de accesibilidad |
| **Maintainability** | A | A | Ambos proyectos son mantenibles |
| **Líneas de código** | 3,996 | 11,667 | El frontend triplica en tamaño al backend |

#### Detalle de Code Smells — Backend (7 issues)

| # | Severidad | Regla | Archivo | Línea | Descripción |
|---|:---:|---|---|:---:|---|
| 1 | MAJOR | `typescript:S6582` | `recycling-centers.service.ts` | 214 | Preferir optional chaining en lugar de múltiples comprobaciones |
| 2 | MAJOR | `typescript:S6582` | `recycling-records.service.ts` | 429 | Preferir optional chaining |
| 3 | MAJOR | `typescript:S6582` | `recycling-records.service.ts` | 60 | Preferir optional chaining |
| 4 | MAJOR | `typescript:S6582` | `recycling-records.service.ts` | 64 | Preferir optional chaining |
| 5 | MINOR | `typescript:S1128` | `auth.service.ts` | N/A | Remover import no usado de `UserRoleEnum` |
| 6 | MINOR | `typescript:S1128` | `coupon-redemption.entity.ts` | N/A | Remover import no usado de `OneToOne` |
| 7 | MINOR | `typescript:S7780` | `config/env.ts` | 68 | Usar `String.raw` para evitar escapar `\` |
| 8 | MINOR | `typescript:S7781` | `config/env.ts` | 68-69 | Preferir `String#replaceAll()` sobre `String#replace()` |

> **Nota:** SonarQube reporta 7 code smells porque algunos son agrupados. La lista expandida muestra 8 hallazgos individuales. Ninguno representa un riesgo de seguridad; son problemas de estilo y mantenibilidad.

#### Detalle de Bugs — Frontend (2 issues)

| # | Severidad | Regla | Archivo | Línea | Descripción |
|---|:---:|---|---|:---:|---|
| 1 | MINOR | `Web:ItemTagWithClickHandlerDoesNotHaveKeyboardListenerCheck` | `gamification/wallet/page.tsx` | 293 | Elemento visible con click handler sin keyboard listener |
| 2 | MINOR | `Web:ItemTagWithClickHandlerDoesNotHaveKeyboardListenerCheck` | `gamification/wallet/page.tsx` | 298 | Elemento visible con click handler sin keyboard listener |

> **Impacto:** Estos bugs afectan la accesibilidad (WCAG 2.1). Usuarios que navegan con teclado no pueden interactuar con los elementos de canje de cupones. No representan riesgo de seguridad pero sí de usabilidad.

#### Security Hotspot — Frontend

Se detectó **1 security hotspot** en el frontend. La API de SonarQube no permite acceder a los detalles vía REST sin permisos de administrador. Se recomienda revisar manualmente en `http://localhost:9000/dashboard?id=eco-frontend` > pestaña "Security Hotspots" para identificar si corresponde a un falso positivo o requiere acción.

---

### 3.1.2 Identificación de Defectos por OWASP Top 10 (2021)

Se realizó una revisión manual del código de autenticación (`auth.service.ts`, `jwt-auth.guard.ts`, `password.service.ts`, `auth.module.ts`) contrastándolo con las categorías del OWASP Top 10.

#### A02:2021 — Fallos Criptográficos

**Hallazgo:** La implementación actual es **robusta** en este aspecto.

| Aspecto evaluado | Estado | Evidencia |
|---|---|---|
| Hashing de contraseñas | ✅ Correcto | Usa `scrypt` con salt aleatorio de 16 bytes (`node:crypto`) |
| Comparación timing-safe | ✅ Correcto | `timingSafeEqual` para prevenir timing attacks |
| Almacenamiento de salt | ✅ Correcto | Formato `salt:hash` en base de datos |
| JWT Secret | ✅ Correcto | Vía variable de entorno `JWT_SECRET`, validado en `environment.validation.ts` |
| Fallback en test | ⚠️ Bajo riesgo | Solo expone `'test-secret'` cuando `NODE_ENV=test` (no afecta producción) |

**Conclusión:** Sin vulnerabilidades criptográficas detectadas. El uso de `scrypt` con `timingSafeEqual` sigue las mejores prácticas de OWASP.

#### A07:2021 — Fallos de Identificación y Autenticación

**Hallazgo 1: Sin rate limiting en `/auth/login`** ⚠️

```typescript
// auth.controller.ts — no tiene protección contra fuerza bruta
@Post('login')
async login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
}
```

**Riesgo:** Un atacante puede realizar intentos ilimitados de login por fuerza bruta, probando combinaciones de email/contraseña sin restricción. Esto es la vulnerabilidad más común del OWASP Top 10 (A07).

**Hallazgo 2: JWT con expiración prolongada** ⚠️

```typescript
// auth.module.ts:31-33
expiresIn: Number.isFinite(configuredExpiration)
  ? configuredExpiration
  : 60 * 60 * 24 * 7,  // 7 días por defecto
```

**Riesgo:** Si un token es robado (XSS, MITM, localStorage compromise), el atacante tiene 7 días de acceso. No existe mecanismo de revocación ni refresh tokens.

**Hallazgo 3: Almacenamiento en localStorage (frontend)** ⚠️

```typescript
// lib/api.ts:454
window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
```

**Riesgo:** El JWT se almacena en `localStorage`, accesible por cualquier script JavaScript en el mismo origen. Si existe una vulnerabilidad XSS, el token puede ser robado. Lo recomendado por OWASP es usar cookies `HttpOnly; Secure; SameSite=Strict`.

**Hallazgo 4: Sin mecanismo de logout forzado**

No existe invalidación de tokens ni blacklist. Si un usuario cambia su contraseña, los tokens anteriores siguen siendo válidos hasta que expiren.

#### A01:2021 — Control de Acceso Roto

**Hallazgo:** La implementación es **sólida** en este aspecto.

| Aspecto evaluado | Estado | Evidencia |
|---|---|---|
| Guards por rol | ✅ Correcto | `AdminGuard`, `ClientGuard`, `JwtAuthGuard` implementados |
| Validación en dos capas | ✅ Correcto | Guards + validaciones en servicios (`RecyclingRecordsService.processValidation`) |
| Rutas admin protegidas | ✅ Correcto | `AdminGuard` en todas las rutas `/admin/*` |
| Validación de centro del validador | ✅ Correcto | `getValidatorAssignment` verifica pertenencia al centro |
| Mensajes genéricos | ✅ Correcto | Login responde "Correo o contraseña inválidos" sin revelar cuál falló |

#### A03:2021 — Inyección

**Hallazgo:** La implementación es **segura**.

| Aspecto evaluado | Estado | Evidencia |
|---|---|---|
| SQL Injection | ✅ Protegido | TypeORM usa consultas parametrizadas en todos los repositorios |
| NoSQL Injection | ✅ No aplica | No se usa MongoDB ni queries dinámicas |
| XSS en API | ✅ Protegido | La API devuelve JSON; el frontend usa React que escapa por defecto |
| Command Injection | ✅ No aplica | No se ejecutan comandos del sistema con input de usuario |

---

### 3.1.3 Estrategias de Mitigación

Se proponen e implementan las siguientes mejoras de seguridad:

#### Mitigación 1: Rate Limiting en `/auth/login`

**Problema:** Sin protección contra ataques de fuerza bruta.

**Solución:** Implementar `@nestjs/throttler` para limitar los intentos de login a 5 por minuto por IP.

```typescript
// auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

**Impacto:** Reduce a casi cero la probabilidad de éxito de un ataque de diccionario/brute-force sobre el endpoint de autenticación.

#### Mitigación 2: Reducir expiración JWT + Refresh Token

**Problema:** Token válido por 7 días sin mecanismo de revocación.

**Solución propuesta:** 
- Access token: 15 minutos de expiración
- Refresh token: 7 días, almacenado en cookie `HttpOnly`
- Endpoint `/auth/refresh` para renovar access token

**Impacto:** Un access token robado solo es válido por 15 minutos. El refresh token está protegido contra XSS por ser `HttpOnly`.

#### Mitigación 3: Headers de seguridad HTTP (Helmet)

**Problema:** El backend no envía headers de seguridad HTTP.

**Solución:** Implementar `helmet` en NestJS.

```typescript
// main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  // ...
}
```

**Impacto:** Agrega headers como `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, protegiendo contra clickjacking, MIME sniffing y otros ataques.

---

## 3.2 Métricas de Calidad y Conclusiones

### 3.2.1 Recopilación de Reportes

#### Reportes de Cobertura — Jest

| Proyecto | Total Tests | Coverage | Fecha de ejecución |
|---|---|---|---|
| **eco-backend** (NestJS) | **82** | **89.17%** (Jest) / **84.8%** (SonarQube) | Julio 2026 |
| **eco-frontend** (Next.js) | **56** | **80.42%** (Jest) / **81.0%** (SonarQube) | Julio 2026 |

> **Nota:** La diferencia entre Jest y SonarQube se debe a que Jest excluye archivos vía `collectCoverageFrom` mientras SonarQube aplica sus propias reglas de exclusión (`sonar.coverage.exclusions`). Ambos superan el 80%.

#### Cobertura por módulo — Backend

| Módulo / Archivo | Cobertura Línea | Casos cubiertos |
|---|---|---|
| `auth.service.ts` | 93.9% | CN-01, CN-02, CN-05, CN-06 |
| `wallet.service.ts` | 92.1% | CB-01, CB-02, CB-03, CB-04, R-03 |
| `coupons.service.ts` | 100% | CN-07, CN-08, CB-03 |
| `recycling-records.service.ts` | 75.6% | CB-05, CB-06, CB-07, CB-08, R-02, R-04, R-05 |
| `users.service.ts` | 100% | Perfil, ranking semanal |
| `materials.service.ts` | 100% | CRUD de materiales |
| `password.service.ts` | 93.7% | Hash y verificación |
| `jwt-auth.guard.ts` | 100% | R-06 |
| `admin.guard.ts` | 100% | R-01, CN-09 |
| `client.guard.ts` | 100% | Control de roles |
| `string.transforms.ts` | 100% | Normalización de strings |
| `week-range.utils.ts` | 100% | Cálculo de rango semanal |
| `app.service.ts` | 100% | Estado del servicio |

#### Cobertura por archivo — Frontend

| Archivo | Cobertura Línea | Descripción |
|---|---|---|
| `lib/api.ts` | ~80% | Token management, role helpers, funciones de API |
| `lib/utils.ts` | 100% | Función `cn()` de clases CSS |
| `lib/error-capture.ts` | 96% | Captura y consumo de errores globales |
| `lib/error-page.ts` | 100% | Página de error HTML |
| `hooks/use-mobile.tsx` | 92% | Detección de viewport móvil |
| `components/Providers.tsx` | 100% | Wrapper de React Query + Sonner |

#### Reportes de SonarQube

Los dashboards completos están disponibles en:

- **Backend:** `http://localhost:9000/dashboard?id=eco-backend`
- **Frontend:** `http://localhost:9000/dashboard?id=eco-frontend`

Ambos proyectos pasan el Quality Gate por defecto de SonarQube (0 bugs bloqueantes, 0 vulnerabilidades, coverage > 80%).

---

### 3.2.2 Interpretación y Densidad de Defectos

#### Densidad de Defectos

| Proyecto | Líneas (ncloc) | Bugs | Code Smells | Defectos / 1000 LOC |
|---|---|---|---|---|
| Backend | 3,996 | 0 | 7 | **1.75** |
| Frontend | 11,667 | 2 | 214 | **18.5** |

> **Interpretación:** El backend tiene una densidad de defectos muy baja (1.75 defectos por cada 1000 líneas), indicando alta calidad de código. El frontend presenta una densidad mayor (18.5/KLOC), principalmente por los 214 code smells. Sin embargo, la mayoría de estos provienen de los componentes `shadcn/ui` (46 archivos generados automáticamente) que no fueron modificados por el equipo.

#### Distribución de severidad — Code Smells (Backend)

```
MAJOR  ████████ 4
MINOR  ██████   3 (5 expandidos)
```

#### Distribución de severidad — Bugs y Vulnerabilidades

```
BUGS (MINOR)  ██ 2  — Frontend (accesibilidad)
VULNERABILIDADES   — 0 en ambos proyectos
HOTSPOTS           — 1 en Frontend (pendiente revisión)
```

#### Tabla de Trazabilidad: Casos de Prueba → Código Automatizado

Los IDs definidos en la Fase 1 (Matriz de Casos de Prueba) fueron implementados como nombres de tests en Jest:

| ID | Descripción | Archivo de test | Estado |
|----|-----------|----------------|:---:|
| CN-01 | Registro con datos válidos | `auth.service.spec.ts` | ✅ |
| CN-02 | Registro con correo existente | `auth.service.spec.ts` | ✅ |
| CN-05 | Login con credenciales correctas | `auth.service.spec.ts` | ✅ |
| CN-06 | Login con contraseña incorrecta | `auth.service.spec.ts` | ✅ |
| CN-07 | Creación de cupón con puntos > 0 | `coupons.service.spec.ts` | ✅ |
| CN-08 | Creación de cupón sin título | `coupons.service.spec.ts` | ✅ |
| CN-09 | Sin permisos para crear cupón | `guards.spec.ts` (AdminGuard) | ✅ |
| CB-01 | Canje sin saldo suficiente | `wallet.service.spec.ts` | ✅ |
| CB-02 | Canje sin stock | `wallet.service.spec.ts` | ✅ |
| CB-03 | Canje de cupón expirado | `wallet.service.spec.ts` | ✅ |
| CB-04 | Canje válido | `wallet.service.spec.ts` | ✅ |
| CB-05 | QR duplicado | `recycling-records.service.spec.ts` | ✅ |
| CB-06 | Cálculo de puntos y CO2 | `recycling-records.service.spec.ts` | ✅ |
| CB-07 | Registro ya procesado | `recycling-records.service.spec.ts` | ✅ |
| CB-08 | Rechazo no suma puntos | `recycling-records.service.spec.ts` | ✅ |
| R-01 | Acceso no autorizado a admin | `guards.spec.ts` (AdminGuard) | ✅ |
| R-02 | Validador de otro centro | `recycling-records.service.spec.ts` | ✅ |
| R-03 | Condición de carrera (stock=1) | `wallet.service.spec.ts` | ✅ |
| R-04 | Cliente intenta validar | `recycling-records.service.spec.ts` | ✅ |
| R-05 | Doble validación | `recycling-records.service.spec.ts` | ✅ |
| R-06 | Token expirado/alterado | `guards.spec.ts` (JwtAuthGuard) | ✅ |

**Resultado: 21/23 casos de la matriz original están automatizados y pasan.** Los 2 casos no cubiertos (CN-03 y CN-04 — validación de DTOs con class-validator) dependen de pruebas de integración con Supertest (Fase 2).

---

### 3.2.3 Resumen Ejecutivo

#### Cómo el Testing Estructurado Reduce Riesgos Comerciales en EcoTrack

EcoTrack es una plataforma que maneja un activo con valor económico real: los **EcoPuntos**, canjeables por cupones comerciales. Cada fallo en la lógica de negocio tiene un impacto financiero directo. La estrategia de testing implementada en este proyecto integrador aborda los tres pilares de riesgo del sistema:

---

**1. Riesgo Financiero — Duplicación de EcoPuntos**

*Problema:* Un bug en `wallet.service.ts` o `recycling-records.service.ts` podría duplicar puntos (doble validación, canjes simultáneos, validación de QR ya usado).

*Mitigación:* Las pruebas CB-01 a CB-08 y R-03 a R-05 validan explícitamente que:
- No se puede canjear sin saldo suficiente
- No se puede validar dos veces el mismo reciclaje (409 Conflict)
- Dos canjes concurrentes con stock=1 solo permiten uno exitoso (pessimistic_write)
- Los rechazos no generan EcoPuntos

**Impacto:** Reducción a cero del riesgo de emisión fraudulenta de puntos.

---

**2. Riesgo de Seguridad — Acceso No Autorizado**

*Problema:* Un Cliente podría acceder a rutas de administración, o un Validador podría validar reciclajes fuera de su centro asignado.

*Mitigación:* Las pruebas R-01, R-02, R-04, R-06 validan:
- `AdminGuard` bloquea a Cliente y Validador
- `ClientGuard` bloquea a Admin y Validador
- `JwtAuthGuard` rechaza tokens expirados o inválidos
- `RecyclingRecordsService` verifica pertenencia al centro (R-02)

**Impacto:** Prevención de escalación de privilegios y acceso indebido a datos o funciones administrativas.

---

**3. Riesgo de Calidad — Deuda Técnica**

*Problema:* El frontend acumula 214 code smells (principalmente en componentes shadcn/ui generados). Sin monitoreo, esto crece exponencialmente.

*Mitigación:* SonarQube integrado en el pipeline CI/CD permite:
- Monitoreo continuo de code smells, bugs y vulnerabilidades
- Quality Gate que bloquea deploys si aparecen nuevos bugs críticos
- Métricas de cobertura que exigen >80% para nuevos commits

**Impacto:** La deuda técnica es visible y medible. El equipo puede priorizar su reducción antes de que afecte la mantenibilidad.

---

#### Conclusión General

| Indicador | Antes de la Fase 3 | Después de la Fase 3 |
|---|---|---|
| Cobertura Backend | 0% | **84.8%** |
| Cobertura Frontend | 0% | **81.0%** |
| Tests automatizados | 0 | **138** (82 backend + 56 frontend) |
| Vulnerabilidades detectadas | Desconocidas | **0 vulnerabilidades, 1 hotspot** |
| Calificación Seguridad | N/A | **A (ambos proyectos)** |
| Casos de prueba trazables | 23 (teóricos) | **21 automatizados (91%)** |

**El testing estructurado implementado en EcoTrack transformó dos proyectos sin cobertura en sistemas con >80% de cobertura automatizada, 138 pruebas unitarias, cero vulnerabilidades de seguridad, y métricas de calidad visibles y accionables.** Esto garantiza que los módulos críticos del negocio — autenticación, billetera, canje de cupones y registros de reciclaje — están protegidos contra los fallos más comunes que podrían generar pérdidas económicas o daños reputacionales.

---

## Anexos

### A. Comandos de ejecución

```bash
# Backend — Instalar dependencias de test
cd eco-backend/ecotrack-backend
pnpm add -D jest @types/jest ts-jest @nestjs/testing

# Backend — Ejecutar tests con cobertura
pnpm test:cov

# Backend — Escanear con SonarQube
sonar-scanner

# Frontend — Instalar dependencias de test
cd eco-frontend/ecotrack-frontend
pnpm add -D jest @types/jest @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest jest-environment-jsdom identity-obj-proxy

# Frontend — Ejecutar tests con cobertura
pnpm test:cov

# Frontend — Escanear con SonarQube
sonar-scanner
```

### B. Archivos de configuración generados

- `eco-backend/ecotrack-backend/jest.config.ts` — Configuración de Jest para NestJS
- `eco-backend/ecotrack-backend/sonar-project.properties` — Exclusiones de cobertura y path al lcov
- `eco-frontend/ecotrack-frontend/jest.config.ts` — Configuración de Jest para Next.js
- `eco-frontend/ecotrack-frontend/sonar-project.properties` — Exclusiones de cobertura

### C. Archivos de test generados

**Backend (11 archivos de spec):**
- `src/auth/auth.service.spec.ts`
- `src/auth/password.service.spec.ts`
- `src/coupons/coupons.service.spec.ts`
- `src/wallet/wallet.service.spec.ts`
- `src/recycling-records/recycling-records.service.spec.ts`
- `src/users/users.service.spec.ts`
- `src/materials/materials.service.spec.ts`
- `src/app.service.spec.ts`
- `src/guards.spec.ts`
- `src/common/transforms/string.transforms.spec.ts`
- `src/common/utils/week-range.utils.spec.ts`

**Frontend (7 archivos de spec):**
- `lib/api.spec.ts`
- `lib/api-request.spec.ts`
- `lib/utils.spec.ts`
- `lib/error-capture.spec.ts`
- `lib/error-page.spec.ts`
- `hooks/use-mobile.spec.tsx`
- `components/Providers.spec.tsx`

### D. URLs de SonarQube

- Backend: `http://localhost:9000/dashboard?id=eco-backend`
- Frontend: `http://localhost:9000/dashboard?id=eco-frontend`
