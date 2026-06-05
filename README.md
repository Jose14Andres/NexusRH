# NexusRH — Sistema de Gestión de Recursos Humanos

Stack: React + Vite + TailwindCSS / Node.js + Express / Prisma + SQLite → PostgreSQL / JWT + bcrypt / RBAC

## Requisitos

- Node.js >= 18
- npm >= 9

---

## Instalación

### 1. Clonar y configurar variables de entorno

```bash
cp .env.example server/.env
```

Edita `server/.env` con tus valores (al menos `JWT_SECRET` y `JWT_REFRESH_SECRET`).

### 2. Instalar dependencias

```bash
# Servidor
cd server && npm install

# Cliente
cd ../client && npm install
```

### 3. Base de datos

```bash
cd server

# Crear tablas (SQLite por defecto)
npx prisma migrate dev --name init

# Cargar datos iniciales (roles, permisos, usuario admin)
npm run db:seed
```

### 4. Levantar el proyecto

```bash
# Terminal 1 — API (puerto 3000)
cd server && npm run dev

# Terminal 2 — Frontend (puerto 5173)
cd client && npm run dev
```

Abre: http://localhost:5173

**Credenciales iniciales:** `admin` / `Admin1234!`

---

## Endpoints de Auth

| Método | Ruta                        | Permiso       | Descripción                         |
|--------|-----------------------------|---------------|-------------------------------------|
| POST   | /api/auth/login             | público       | Login → accessToken + cookie        |
| POST   | /api/auth/refresh           | cookie        | Renovar accessToken                 |
| POST   | /api/auth/logout            | JWT           | Cerrar sesión                       |
| GET    | /api/auth/me                | JWT           | Datos del usuario autenticado       |
| PUT    | /api/auth/change-password   | JWT           | Cambiar contraseña propia           |

---

## Roles y acceso

| Rol          | Acceso                                               |
|--------------|------------------------------------------------------|
| ADMIN        | Control total                                        |
| RRHH         | CRUD empleados, nómina, afiliaciones, exportar todo  |
| CONTABILIDAD | Lectura nómina, generar períodos, exportar finanzas  |
| SUPERVISOR   | Lectura su departamento, aprobar horas               |
| EMPLEADO     | Solo sus propios datos                               |

---

## Cambiar a PostgreSQL

1. `server/.env` → cambia `DATABASE_URL` a tu cadena de PostgreSQL
2. `server/prisma/schema.prisma` → cambia `provider = "sqlite"` a `"postgresql"`
3. En los campos `Float` de dinero, usa `Decimal @db.Decimal(10,2)`
4. `npx prisma migrate dev --name postgres-init`

---

## Estructura del proyecto

```
NexusRH/
├── client/          React + Vite + TailwindCSS
│   └── src/
│       ├── api/         axios con interceptor de refresh
│       ├── features/auth/   login, contexto, token store
│       ├── hooks/           usePermission
│       ├── components/      ProtectedRoute
│       ├── layouts/         DashboardLayout (sidebar RBAC)
│       └── pages/           Dashboard + placeholders
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma    modelo de datos completo
│   │   └── seed.ts          roles, permisos, admin inicial
│   └── src/
│       ├── lib/             prisma, jwt, bcrypt
│       ├── middleware/      auth (verifyJWT, checkPermission, checkScope)
│       │                    auditoria, validate (zod)
│       └── modules/auth/    login, refresh, logout, me, change-password
│
└── .env.example
```
