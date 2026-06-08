import { prisma } from '../../lib/prisma';
import {
  handleDbError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../lib/errors';
import {
  CreateHoras,
  UpdateHoras,
  RechazarInput,
  ListHorasQuery,
  ResumenQuery,
} from './horas.schemas';

export type ViewerContext = {
  roles: string[];
  sub: string;              // usuarioId
  empleadoId?: string | null;
  departamentoId?: string | null;
};

const PRIVILEGED = ['ADMIN', 'RRHH'];

function isPrivileged(v: ViewerContext) {
  return v.roles.some(r => PRIVILEGED.includes(r));
}

function isSupervisor(v: ViewerContext) {
  return v.roles.includes('SUPERVISOR');
}

// ─── Scope para listar ────────────────────────────────────
function buildScopeWhere(v: ViewerContext) {
  if (isPrivileged(v)) return {};
  if (isSupervisor(v) && v.departamentoId) {
    // Filtra por empleados del mismo departamento vía join
    return { empleado: { departamentoId: v.departamentoId } };
  }
  // EMPLEADO: solo sus propios registros
  return { empleadoId: v.empleadoId ?? '__none__' };
}

// ─── Verificar que el empleado pertenece al dept del viewer ──
async function assertSameDept(empleadoId: string, v: ViewerContext) {
  if (isPrivileged(v)) return;
  if (isSupervisor(v)) {
    const emp = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      select: { departamentoId: true },
    });
    if (!emp) throw new NotFoundError('Empleado no encontrado');
    if (emp.departamentoId !== v.departamentoId) {
      throw new ForbiddenError('Solo puedes gestionar horas de tu departamento');
    }
    return;
  }
  // EMPLEADO: solo puede crear registros para sí mismo
  if (v.empleadoId !== empleadoId) {
    throw new ForbiddenError('Solo puedes registrar tus propias horas');
  }
}

const INCLUDE_BASE = {
  empleado: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      departamento: { select: { id: true, nombre: true } },
      cargo: { select: { id: true, nombre: true } },
    },
  },
} as const;

// ─── Lógica de transición (exportada para tests) ──────────
export type EstadoHoras = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export function assertTransicionValida(estadoActual: string, accion: 'aprobar' | 'rechazar') {
  if (estadoActual !== 'PENDIENTE') {
    throw new ConflictError(
      `No se puede ${accion} un registro en estado ${estadoActual}`,
    );
  }
}

export function canApprove(empleadoDeptId: string, v: ViewerContext): boolean {
  if (isPrivileged(v)) return true;
  if (isSupervisor(v)) return v.departamentoId === empleadoDeptId;
  return false;
}

// ─── Lógica de resumen (exportada para tests) ─────────────
export function buildResumen(registros: Array<{
  horasNormales: number;
  horasExtras: number;
  estado: string;
}>) {
  const aprobados = registros.filter(r => r.estado === 'APROBADO');
  return {
    horasNormales: aprobados.reduce((s, r) => s + r.horasNormales, 0),
    horasExtras:   aprobados.reduce((s, r) => s + r.horasExtras, 0),
    totalRegistros: aprobados.length,
  };
}

// ─── CRUD ─────────────────────────────────────────────────
export async function findAll(query: ListHorasQuery, v: ViewerContext) {
  const { empleadoId, departamentoId, estado, mes, anio, page, limit } = query;
  const scope = buildScopeWhere(v);

  // Rango de fechas si se filtra por mes/año
  let fechaWhere: object = {};
  if (mes && anio) {
    const desde = new Date(anio, mes - 1, 1);
    const hasta = new Date(anio, mes, 1);
    fechaWhere = { fecha: { gte: desde, lt: hasta } };
  } else if (anio) {
    fechaWhere = { fecha: { gte: new Date(anio, 0, 1), lt: new Date(anio + 1, 0, 1) } };
  }

  const where = {
    ...scope,
    ...(empleadoId     ? { empleadoId }                                                        : {}),
    ...(departamentoId ? { empleado: { ...((scope as any).empleado ?? {}), departamentoId } }  : {}),
    ...(estado         ? { estado }                                                             : {}),
    ...fechaWhere,
  };

  const [total, items] = await Promise.all([
    prisma.registroHoras.count({ where }),
    prisma.registroHoras.findMany({
      where,
      include: INCLUDE_BASE,
      orderBy: [{ fecha: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { data: items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function findPendientes(v: ViewerContext) {
  const where: Record<string, unknown> = { estado: 'PENDIENTE' };
  if (!isPrivileged(v) && isSupervisor(v) && v.departamentoId) {
    where.empleado = { departamentoId: v.departamentoId };
  }
  return prisma.registroHoras.findMany({
    where,
    include: INCLUDE_BASE,
    orderBy: [{ fecha: 'asc' }],
  });
}

export async function findById(id: string, v: ViewerContext) {
  const reg = await prisma.registroHoras.findUnique({
    where: { id },
    include: INCLUDE_BASE,
  });
  if (!reg) throw new NotFoundError('Registro de horas no encontrado');

  if (!isPrivileged(v)) {
    if (isSupervisor(v)) {
      if (reg.empleado.departamento.id !== v.departamentoId) {
        throw new ForbiddenError('No tienes acceso a este registro');
      }
    } else if (reg.empleadoId !== v.empleadoId) {
      throw new ForbiddenError('Solo puedes acceder a tus propios registros');
    }
  }
  return reg;
}

export async function create(data: CreateHoras, v: ViewerContext) {
  await assertSameDept(data.empleadoId, v);
  try {
    return await prisma.registroHoras.create({
      data,
      include: INCLUDE_BASE,
    });
  } catch (err) {
    handleDbError(err);
  }
}

export async function update(id: string, data: UpdateHoras, v: ViewerContext) {
  const reg = await prisma.registroHoras.findUnique({ where: { id } });
  if (!reg) throw new NotFoundError('Registro de horas no encontrado');

  if (reg.estado !== 'PENDIENTE') {
    throw new ConflictError('Solo se pueden editar registros en estado PENDIENTE');
  }

  // Solo el dueño o privilegiados pueden editar
  if (!isPrivileged(v) && reg.empleadoId !== v.empleadoId) {
    throw new ForbiddenError('Solo puedes editar tus propios registros');
  }

  try {
    return await prisma.registroHoras.update({
      where: { id },
      data,
      include: INCLUDE_BASE,
    });
  } catch (err) {
    handleDbError(err);
  }
}

export async function remove(id: string, v: ViewerContext) {
  const reg = await prisma.registroHoras.findUnique({ where: { id } });
  if (!reg) throw new NotFoundError('Registro de horas no encontrado');

  if (reg.estado !== 'PENDIENTE') {
    throw new ConflictError('Solo se pueden eliminar registros en estado PENDIENTE');
  }

  if (!isPrivileged(v) && reg.empleadoId !== v.empleadoId) {
    throw new ForbiddenError('Solo puedes eliminar tus propios registros');
  }

  return prisma.registroHoras.delete({ where: { id } });
}

// ─── Aprobación / Rechazo ─────────────────────────────────
export async function aprobar(id: string, v: ViewerContext) {
  const reg = await prisma.registroHoras.findUnique({
    where: { id },
    include: { empleado: { select: { departamentoId: true } } },
  });
  if (!reg) throw new NotFoundError('Registro de horas no encontrado');

  assertTransicionValida(reg.estado, 'aprobar');

  if (!canApprove(reg.empleado.departamentoId, v)) {
    throw new ForbiddenError('No tienes permiso para aprobar horas de este departamento');
  }

  return prisma.registroHoras.update({
    where: { id },
    data: { estado: 'APROBADO', aprobadoPor: v.sub, aprobadoAt: new Date() },
    include: INCLUDE_BASE,
  });
}

export async function rechazar(id: string, input: RechazarInput, v: ViewerContext) {
  const reg = await prisma.registroHoras.findUnique({
    where: { id },
    include: { empleado: { select: { departamentoId: true } } },
  });
  if (!reg) throw new NotFoundError('Registro de horas no encontrado');

  assertTransicionValida(reg.estado, 'rechazar');

  if (!canApprove(reg.empleado.departamentoId, v)) {
    throw new ForbiddenError('No tienes permiso para rechazar horas de este departamento');
  }

  return prisma.registroHoras.update({
    where: { id },
    data: {
      estado: 'RECHAZADO',
      aprobadoPor: v.sub,
      aprobadoAt: new Date(),
      motivoRechazo: input.motivoRechazo,
    },
    include: INCLUDE_BASE,
  });
}

// ─── Resumen para nómina ──────────────────────────────────
export async function resumen(query: ResumenQuery, v: ViewerContext) {
  const { empleadoId, mes, anio } = query;

  // Scope: EMPLEADO solo puede ver su propio resumen
  if (!isPrivileged(v) && !isSupervisor(v)) {
    if (empleadoId && empleadoId !== v.empleadoId) {
      throw new ForbiddenError('Solo puedes ver tu propio resumen de horas');
    }
  }

  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 1);

  const registros = await prisma.registroHoras.findMany({
    where: {
      ...(empleadoId ? { empleadoId } : {}),
      fecha: { gte: desde, lt: hasta },
    },
    select: {
      id: true,
      empleadoId: true,
      fecha: true,
      horasNormales: true,
      horasExtras: true,
      estado: true,
    },
  });

  return {
    mes,
    anio,
    empleadoId: empleadoId ?? null,
    ...buildResumen(registros),
    detalle: registros.filter(r => r.estado === 'APROBADO'),
  };
}
