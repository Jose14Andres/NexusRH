-- CreateTable
CREATE TABLE "Organizacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PRIVADA',
    "ruc" TEXT NOT NULL,
    "direccion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Departamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Departamento_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "Organizacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cargo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "departamentoId" TEXT NOT NULL,
    "sueldoBase" REAL NOT NULL,
    "jornadaHoras" INTEGER NOT NULL DEFAULT 8,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cargo_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cedula" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "fechaIngreso" DATETIME NOT NULL,
    "fechaSalida" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "cargoId" TEXT NOT NULL,
    "departamentoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Empleado_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "Cargo" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Empleado_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Afiliacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empleadoId" TEXT NOT NULL,
    "asegurado" BOOLEAN NOT NULL DEFAULT false,
    "numeroAfiliacion" TEXT,
    "tipoSeguro" TEXT NOT NULL DEFAULT 'NINGUNO',
    "fechaAfiliacion" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Afiliacion_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistroHoras" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empleadoId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "horasNormales" REAL NOT NULL DEFAULT 0,
    "horasExtras" REAL NOT NULL DEFAULT 0,
    "observacion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "aprobadoPor" TEXT,
    "aprobadoAt" DATETIME,
    "motivoRechazo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistroHoras_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfiguracionNomina" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aportePersonalPct" REAL NOT NULL DEFAULT 0.0945,
    "aportePatronalPct" REAL NOT NULL DEFAULT 0.1215,
    "valorHoraExtraPct" REAL NOT NULL DEFAULT 0.25,
    "fondosReservaPct" REAL NOT NULL DEFAULT 0.0833,
    "decimoTerceroPct" REAL NOT NULL DEFAULT 0.0833,
    "decimoCuartoPct" REAL NOT NULL DEFAULT 0.0833,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Nomina" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empleadoId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "sueldoBruto" REAL NOT NULL,
    "aportePersonal" REAL NOT NULL,
    "aportePatronal" REAL NOT NULL,
    "fondosReserva" REAL NOT NULL DEFAULT 0,
    "decimoTercero" REAL NOT NULL DEFAULT 0,
    "decimoCuarto" REAL NOT NULL DEFAULT 0,
    "descuentos" REAL NOT NULL DEFAULT 0,
    "bonos" REAL NOT NULL DEFAULT 0,
    "horasExtrasValor" REAL NOT NULL DEFAULT 0,
    "horasExtrasQty" REAL NOT NULL DEFAULT 0,
    "sueldoNeto" REAL NOT NULL,
    "fechaPago" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Nomina_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "empleadoId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "refreshToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Usuario_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RolSistema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Permiso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UsuarioRol" (
    "usuarioId" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "asignadoAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("usuarioId", "rolId"),
    CONSTRAINT "UsuarioRol_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UsuarioRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "RolSistema" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RolPermiso" (
    "rolId" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,

    PRIMARY KEY ("rolId", "permisoId"),
    CONSTRAINT "RolPermiso_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "RolSistema" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RolPermiso_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "Permiso" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" TEXT,
    "ip" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogAuditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Organizacion_ruc_key" ON "Organizacion"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nombre_organizacionId_key" ON "Departamento"("nombre", "organizacionId");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_cedula_key" ON "Empleado"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_email_key" ON "Empleado"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Afiliacion_empleadoId_key" ON "Afiliacion"("empleadoId");

-- CreateIndex
CREATE INDEX "RegistroHoras_empleadoId_estado_idx" ON "RegistroHoras"("empleadoId", "estado");

-- CreateIndex
CREATE INDEX "RegistroHoras_fecha_idx" ON "RegistroHoras"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroHoras_empleadoId_fecha_key" ON "RegistroHoras"("empleadoId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Nomina_empleadoId_mes_anio_key" ON "Nomina"("empleadoId", "mes", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_empleadoId_key" ON "Usuario"("empleadoId");

-- CreateIndex
CREATE UNIQUE INDEX "RolSistema_nombre_key" ON "RolSistema"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Permiso_codigo_key" ON "Permiso"("codigo");

-- CreateIndex
CREATE INDEX "LogAuditoria_usuarioId_idx" ON "LogAuditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "LogAuditoria_entidad_entidadId_idx" ON "LogAuditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "LogAuditoria_fecha_idx" ON "LogAuditoria"("fecha");
