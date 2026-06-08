import { prisma } from '../../lib/prisma';
import {
  handleDbError,
  NotFoundError,
  ConflictError,
  ValidationError,
  ForbiddenError,
} from '../../lib/errors';
import { maskCedula } from '../../lib/cedula';
import {
  CreateEmpleado,
  UpdateEmpleado,
  AfiliacionInput,
  ListEmpleadoQuery,
} from './empleado.schemas';

export type ViewerContext = {
  roles: string[];
  empleadoId?: string | null;
  departamentoId?: string | null;
};

const PRIVILEGED = ['ADMIN', 'RRHH', 'CONTABILIDAD'];

function isPrivileged(viewer: ViewerContext): boolean {
  return viewer.roles.some(r => PRIVILEGED.includes(r));
}

function canSeeSensitive(viewer: ViewerContext, empleadoId: string): boolean {
  if (isPrivileged(viewer)) return true;
  return viewer.empleadoId === empleadoId;
}

function applyMask<T extends { id: string; cedula: string }>(emp: T, viewer: ViewerContext): T {
  return canSeeSensitive(viewer, emp.id)
    ? emp
    : { ...emp, cedula: maskCedula(emp.cedula) };
}

const INCLUDE_LIST = {
  cargo:       { select: { id: true, nombre: true, sueldoBase: true } },
  departamento: { select: { id: true, nombre: true } },
  afiliacion:  true,
} as const;

const INCLUDE_DETAIL = {
  ...INCLUDE_LIST,
  usuario: { select: { id: true, username: true, activo: true } },
} as const;

// ─── Scope filter según rol ───────────────────────────────
function buildScopeFilter(viewer: ViewerContext) {
  if (isPrivileged(viewer)) return {};
  if (viewer.roles.includes('SUPERVISOR') && viewer.departamentoId) {
    return { departamentoId: viewer.departamentoId };
  }
  // EMPLEADO: solo su propio registro
  return { id: viewer.empleadoId ?? '__none__' };
}

// ─── Validar que cargo pertenece al departamento ──────────
async function validateCargoDepartamento(cargoId: string, departamentoId: string) {
  const [cargo, dept] = await Promise.all([
    prisma.cargo.findUnique({ where: { id: cargoId } }),
    prisma.departamento.findUnique({ where: { id: departamentoId } }),
  ]);
  if (!cargo) throw new NotFoundError('Cargo no encontrado');
  if (!dept)  throw new NotFoundError('Departamento no encontrado');
  if (cargo.departamentoId !== departamentoId) {
    throw new ValidationError('El cargo no pertenece al departamento indicado');
  }
}

// ─── CRUD ─────────────────────────────────────────────────
export async function findAll(query: ListEmpleadoQuery, viewer: ViewerContext) {
  const { departamentoId, cargoId, estado, q, page, limit } = query;
  const scope = buildScopeFilter(viewer);

  const where = {
    ...scope,
    ...(departamentoId ? { departamentoId } : {}),
    ...(cargoId        ? { cargoId }        : {}),
    ...(estado         ? { estado }         : {}),
    ...(q ? {
      OR: [
        { nombres:   { contains: q } },
        { apellidos: { contains: q } },
        { cedula:    { contains: q } },
        { email:     { contains: q } },
      ],
    } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.empleado.count({ where }),
    prisma.empleado.findMany({
      where,
      include: INCLUDE_LIST,
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data: items.map(e => applyMask(e, viewer)),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function findById(id: string, viewer: ViewerContext) {
  const emp = await prisma.empleado.findUnique({
    where: { id },
    include: INCLUDE_DETAIL,
  });
  if (!emp) throw new NotFoundError('Empleado no encontrado');

  // Scope: SUPERVISOR solo ve su departamento; EMPLEADO solo se ve a sí mismo
  if (!isPrivileged(viewer)) {
    if (viewer.roles.includes('SUPERVISOR')) {
      if (emp.departamentoId !== viewer.departamentoId) {
        throw new ForbiddenError('No tienes acceso a empleados de otro departamento');
      }
    } else {
      if (emp.id !== viewer.empleadoId) {
        throw new ForbiddenError('Solo puedes acceder a tus propios datos');
      }
    }
  }

  return applyMask(emp, viewer);
}

export async function create(data: CreateEmpleado) {
  await validateCargoDepartamento(data.cargoId, data.departamentoId);
  try {
    return await prisma.empleado.create({
      data,
      include: INCLUDE_LIST,
    });
  } catch (err) {
    handleDbError(err);
  }
}

export async function update(id: string, data: UpdateEmpleado) {
  const existing = await prisma.empleado.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Empleado no encontrado');

  const cargoId       = data.cargoId       ?? existing.cargoId;
  const departamentoId = data.departamentoId ?? existing.departamentoId;

  if (data.cargoId || data.departamentoId) {
    await validateCargoDepartamento(cargoId, departamentoId);
  }

  try {
    return await prisma.empleado.update({
      where: { id },
      data,
      include: INCLUDE_LIST,
    });
  } catch (err) {
    handleDbError(err);
  }
}

// Soft delete: cambia estado a INACTIVO
export async function remove(id: string) {
  const existing = await prisma.empleado.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Empleado no encontrado');

  const [nominasActivas, horasPendientes] = await Promise.all([
    prisma.nomina.count({ where: { empleadoId: id, estado: { in: ['PENDIENTE', 'CALCULADO', 'APROBADO'] } } }),
    prisma.registroHoras.count({ where: { empleadoId: id, estado: 'PENDIENTE' } }),
  ]);

  if (nominasActivas > 0) {
    throw new ConflictError(`No se puede desactivar: tiene ${nominasActivas} nómina(s) activa(s)`);
  }
  if (horasPendientes > 0) {
    throw new ConflictError(`No se puede desactivar: tiene ${horasPendientes} registro(s) de horas pendiente(s)`);
  }

  return prisma.empleado.update({
    where: { id },
    data: { estado: 'INACTIVO', fechaSalida: existing.fechaSalida ?? new Date() },
  });
}

// ─── Afiliación ───────────────────────────────────────────
export async function getAfiliacion(empleadoId: string) {
  const emp = await prisma.empleado.findUnique({ where: { id: empleadoId } });
  if (!emp) throw new NotFoundError('Empleado no encontrado');

  const afil = await prisma.afiliacion.findUnique({ where: { empleadoId } });
  return afil ?? {
    empleadoId,
    asegurado: false,
    tipoSeguro: 'NINGUNO',
    numeroAfiliacion: null,
    fechaAfiliacion: null,
  };
}

export async function upsertAfiliacion(empleadoId: string, data: AfiliacionInput) {
  const emp = await prisma.empleado.findUnique({ where: { id: empleadoId } });
  if (!emp) throw new NotFoundError('Empleado no encontrado');

  return prisma.afiliacion.upsert({
    where:  { empleadoId },
    update: data,
    create: { empleadoId, ...data },
  });
}
