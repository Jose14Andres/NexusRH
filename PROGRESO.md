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
| 5 | Nómina | ✅ | ✅ | — | Completo |
| 6 | Estadísticas | ✅ | ✅ | 12 tests | Completo |
| 7 | Exportación (XLSX/PDF/CSV) | ⬜ | ⬜ | — | Pendiente |
| 8 | Admin (usuarios, auditoría, config) | ⬜ | ⬜ | — | Pendiente |

---

## Módulo 5 — Nómina (detalle)

### Endpoints
| Método | Ruta | Permiso |
|--------|------|---------|
| GET    | `/api/nomina`              | `nomina:read`    |
| POST   | `/api/nomina/calcular`     | `nomina:write`   |
| GET    | `/api/nomina/:id`          | `nomina:read`    |
| PUT    | `/api/nomina/:id`          | `nomina:write`   |
| POST   | `/api/nomina/:id/aprobar`  | `nomina:approve` |
| POST   | `/api/nomina/:id/pagar`    | `nomina:approve` |
| DELETE | `/api/nomina/:id`          | `nomina:write`   |

### Flujo de estados
```
CALCULADO → [aprobar] → APROBADO → [pagar] → PAGADO
CALCULADO → [eliminar] → (borrado)
```

### Fórmulas Ecuador (ConfiguracionNomina)
- Aporte personal IESS: 9.45 % del sueldo bruto (solo afiliados IESS)
- Aporte patronal: 12.15 % (costo empresa, informativo)
- Horas extras: `qty × (sueldoBase / (jornada × 20)) × 1.25`
- Fondos de reserva: 8.33 % (desde el 2º año de trabajo)
- Décimo tercero/cuarto: provisión mensual 8.33 % / SBU/12
- Neto = sueldoBruto − aportePersonal − descuentos + bonos

### Scope por rol
- **ADMIN / RRHH / CONTABILIDAD**: todas las nóminas
- **EMPLEADO**: solo la propia

---

## Módulo 6 — Estadísticas (detalle)

### Permisos
| Permiso | Roles |
|---|---|
| `estadisticas:read:self` | todos |
| `estadisticas:read:dept` | SUPERVISOR, RRHH, CONTABILIDAD, ADMIN |
| `estadisticas:read:org`  | RRHH, CONTABILIDAD, ADMIN |

### Endpoints
| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/api/estadisticas/dashboard`                        | `estadisticas:read:self` |
| GET | `/api/estadisticas/individual/historial-salarial`    | `estadisticas:read:self` |
| GET | `/api/estadisticas/individual/horas`                 | `estadisticas:read:self` |
| GET | `/api/estadisticas/individual/aportaciones`          | `estadisticas:read:self` |
| GET | `/api/estadisticas/organizacion/costo-departamento`  | `estadisticas:read:dept` |
| GET | `/api/estadisticas/organizacion/afiliacion`          | `estadisticas:read:org`  |
| GET | `/api/estadisticas/organizacion/distribucion-cargos` | `estadisticas:read:org`  |
| GET | `/api/estadisticas/organizacion/evolucion-nomina`    | `estadisticas:read:dept` |

### Scope por rol (en service, defensa en profundidad)
- `resolveIndividualEmpleadoId`: EMPLEADO/SUPERVISOR → forzado a su propio ID
- `resolveDeptFilter`: EMPLEADO → ForbiddenError; SUPERVISOR → forzado a su dept
- `assertCanReadOrg`: EMPLEADO/SUPERVISOR → ForbiddenError

### Principio: sin duplicar fórmulas
Todos los endpoints leen de `Nomina` (valores ya calculados) y `RegistroHoras` (horas aprobadas). No reimplementan porcentajes de IESS.

---

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

---

## Convenciones del proyecto

- Estructura: `server/src/modules/<módulo>/{schemas,service,controller,routes}.ts`
- Auth: `verifyJWT + checkPermission('<módulo>:<acción>')` en cada ruta
- Validación: Zod en `schemas.ts`, aplicado con middleware `validate()`
- Errores: `NotFoundError / ConflictError / ValidationError / ForbiddenError` + `sendError()`
- Auditoría: `logAuditoria()` en mutaciones importantes (create/update/delete sensibles)
- Datos sensibles: máscara de cédula vía `maskCedula()` para roles no privilegiados
- Tests: lógica pura exportada del service, testeada sin mock de Prisma
