# NexusRH — Progreso de Implementación

## Stack
- **Backend**: Node.js + Express + Prisma + SQLite (dev) / PostgreSQL (prod)
- **Frontend**: React + Vite + TailwindCSS
- **Auth**: JWT (access 15 m + refresh 7 d, httpOnly cookie)
- **Validación**: Zod
- **Tests**: Jest + ts-jest

## Módulos

| # | Módulo | Backend | Frontend | Tests | Estado |
|---|--------|---------|----------|-------|--------|
| 0 | Infra (Prisma, RBAC, seed) | ✅ | — | — | Completo |
| 1 | Auth (login, refresh, me) | ✅ | ✅ | — | Completo |
| 2 | Organización / Departamentos / Cargos | ✅ | ✅ | — | Completo |
| 3 | Empleados + Afiliación | ✅ | ✅ | 11 tests | Completo |
| 4 | Registro de Horas | ✅ | ✅ | 20 tests | Completo |
| 5 | Nómina | ⬜ | ⬜ | — | Pendiente |
| 6 | Estadísticas | ⬜ | ⬜ | — | Pendiente |
| 7 | Exportación (XLSX/PDF/CSV) | ⬜ | ⬜ | — | Pendiente |
| 8 | Admin (usuarios, auditoría, config) | ⬜ | ⬜ | — | Pendiente |

## Módulo 4 — Registro de Horas (detalle)

### Endpoints
| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/api/horas` | `horas:read` |
| POST | `/api/horas` | `horas:write` |
| GET | `/api/horas/pendientes` | `horas:approve` |
| GET | `/api/horas/resumen` | `horas:read` |
| GET | `/api/horas/:id` | `horas:read` |
| PUT | `/api/horas/:id` | `horas:write` |
| DELETE | `/api/horas/:id` | `horas:write` |
| POST | `/api/horas/:id/aprobar` | `horas:approve` |
| POST | `/api/horas/:id/rechazar` | `horas:approve` |

### Flujo de aprobación
```
PENDIENTE → [aprobar] → APROBADO  (aprobadoPor + aprobadoAt)
PENDIENTE → [rechazar] → RECHAZADO (motivoRechazo + aprobadoAt)
APROBADO / RECHAZADO → cualquier acción → ConflictError
```

### Scope por rol
- **ADMIN / RRHH**: acceso total
- **SUPERVISOR**: solo empleados de su `departamentoId`
- **EMPLEADO**: solo sus propios registros

### Resumen para nómina
`GET /api/horas/resumen?empleadoId=X&mes=3&anio=2025`
→ Suma de `horasNormales` y `horasExtras` solo de registros `APROBADO`.
El módulo 5 consume este endpoint directamente.

## Convenciones del proyecto

- Estructura: `server/src/modules/<módulo>/{schemas,service,controller,routes}.ts`
- Auth: `verifyJWT + checkPermission('<módulo>:<acción>')` en cada ruta
- Validación: Zod en `schemas.ts`, aplicado con middleware `validate()`
- Errores: `NotFoundError / ConflictError / ValidationError / ForbiddenError` + `sendError()`
- Auditoría: `logAuditoria()` en mutaciones importantes (create/update/delete sensibles)
- Datos sensibles: máscara de cédula vía `maskCedula()` para roles no privilegiados
- Tests: lógica pura exportada del service, testeada sin mock de Prisma
