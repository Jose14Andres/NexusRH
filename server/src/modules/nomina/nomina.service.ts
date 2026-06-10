import { prisma } from '../../lib/prisma';
import {
  handleDbError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../lib/errors';
import {
  CalcularNominaInput,
  UpdateNomina,
  PagarNomina,
  ListNominaQuery,
} from './nomina.schemas';

// SBU Ecuador 2024 (Salario Básico Unificado)
const SBU = 460;

export type ViewerContext = {
  roles: string[];
  sub: string;
  empleadoId?: string | null;
};

const PRIVILEGED  = ['ADMIN', 'RRHH'];
const CAN_WRITE   = ['ADMIN', 'RRHH', 'CONTABILIDAD'];
const CAN_READ_ALL = ['ADMIN', 'RRHH', 'CONTABILIDAD'];

function isPrivileged(v: ViewerContext)  { return v.roles.some(r => PRIVILEGED.includes(r)); }
function canWriteAll(v: ViewerContext)   { return v.roles.some(r => CAN_WRITE.includes(r)); }
function canReadAll(v: ViewerContext)    { return v.roles.some(r => CAN_READ_ALL.includes(r)); }

function buildScopeWhere(v: ViewerContext) {
  if (canReadAll(v)) return {};
  return { empleadoId: v.empleadoId ?? '__none__' };
}

async function getConfigVigente() {
  const config = await prisma.configuracionNomina.findFirst({
    where: { vigente: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!config) throw new ValidationError('No hay configuración de nómina activa');
  return config;
}

const INCLUDE_BASE = {
  empleado: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      departamento: { select: { id: true, nombre: true } },
      cargo: { select: { id: true, nombre: true, sueldoBase: true } },
    },
  },
} as const;

// ─── Listar ───────────────────────────────────────────────
export async function findAll(query: ListNominaQuery, v: ViewerContext) {
  const { mes, anio, estado, empleadoId, page, limit } = query;
  const scope = buildScopeWhere(v);

  const where = {
    ...scope,
    ...(mes        ? { mes }        : {}),
    ...(anio       ? { anio }       : {}),
    ...(estado     ? { estado }     : {}),
    ...(empleadoId ? { empleadoId } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.nomina.count({ where }),
    prisma.nomina.findMany({
      where,
      include: INCLUDE_BASE,
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { data: items, total, page, totalPages: Math.ceil(total / limit) };
}

export async function findById(id: string, v: ViewerContext) {
  const nomina = await prisma.nomina.findUnique({
    where: { id },
    include: INCLUDE_BASE,
  });
  if (!nomina) throw new NotFoundError('Nómina no encontrada');

  if (!canReadAll(v) && nomina.empleadoId !== v.empleadoId) {
    throw new ForbiddenError('Solo puedes ver tu propia nómina');
  }
  return nomina;
}

// ─── Calcular período ─────────────────────────────────────
export async function calcular(input: CalcularNominaInput, v: ViewerContext) {
  if (!canWriteAll(v)) throw new ForbiddenError('Sin permiso para calcular nóminas');

  const { mes, anio } = input;
  const config = await getConfigVigente();

  // Fecha "hace un año" para evaluar antigüedad (fondos de reserva desde el 2do año)
  const haceUnAnio = new Date(anio - 1, mes - 1, 1);

  const empleados = await prisma.empleado.findMany({
    where: { estado: 'ACTIVO' },
    select: {
      id: true,
      fechaIngreso: true,
      cargo: { select: { sueldoBase: true, jornadaHoras: true } },
      afiliacion: { select: { asegurado: true, tipoSeguro: true } },
    },
  });

  if (empleados.length === 0) {
    throw new ValidationError('No hay empleados activos para calcular nómina');
  }

  // Obtener horas extras aprobadas del período
  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 1);

  const horasData = await prisma.registroHoras.groupBy({
    by: ['empleadoId'],
    where: {
      empleadoId: { in: empleados.map(e => e.id) },
      fecha: { gte: desde, lt: hasta },
      estado: 'APROBADO',
    },
    _sum: { horasExtras: true },
  });

  const horasMap = new Map(horasData.map(h => [h.empleadoId, h._sum.horasExtras ?? 0]));

  const results: string[] = [];
  const errors: Array<{ empleadoId: string; error: string }> = [];

  for (const emp of empleados) {
    try {
      const sueldoBase    = emp.cargo.sueldoBase;
      const jornadaHoras  = emp.cargo.jornadaHoras;
      const tieneIESS     = emp.afiliacion?.asegurado && emp.afiliacion?.tipoSeguro === 'IESS';
      // Fondos de reserva aplican desde el segundo año de trabajo
      const tieneAntiguedad = emp.fechaIngreso <= haceUnAnio;

      const horasExtrasQty   = horasMap.get(emp.id) ?? 0;
      // Valor hora base: sueldoBase / (jornada_diaria × 20 días laborables)
      const valorHoraBase    = sueldoBase / (jornadaHoras * 20);
      const horasExtrasValor = horasExtrasQty * valorHoraBase * (1 + config.valorHoraExtraPct);

      const sueldoBruto    = sueldoBase + horasExtrasValor;
      const aportePersonal = tieneIESS ? sueldoBruto * config.aportePersonalPct : 0;
      const aportePatronal = sueldoBruto * config.aportePatronalPct;
      const fondosReserva  = tieneAntiguedad ? sueldoBruto * config.fondosReservaPct : 0;
      const decimoTercero  = sueldoBruto * config.decimoTerceroPct;
      // Décimo cuarto: SBU / 12 (provisión mensual proporcional)
      const decimoCuarto   = SBU * config.decimoCuartoPct;

      const sueldoNeto = sueldoBruto - aportePersonal;

      await prisma.nomina.upsert({
        where:  { empleadoId_mes_anio: { empleadoId: emp.id, mes, anio } },
        update: {
          sueldoBruto,
          aportePersonal,
          aportePatronal,
          fondosReserva,
          decimoTercero,
          decimoCuarto,
          horasExtrasValor,
          horasExtrasQty,
          sueldoNeto,
          descuentos: 0,
          bonos: 0,
          estado: 'CALCULADO',
        },
        create: {
          empleadoId: emp.id,
          mes,
          anio,
          sueldoBruto,
          aportePersonal,
          aportePatronal,
          fondosReserva,
          decimoTercero,
          decimoCuarto,
          horasExtrasValor,
          horasExtrasQty,
          sueldoNeto,
          estado: 'CALCULADO',
        },
      });
      results.push(emp.id);
    } catch (err) {
      errors.push({ empleadoId: emp.id, error: String(err) });
    }
  }

  return {
    calculadas: results.length,
    errores:    errors.length,
    mes,
    anio,
    ...(errors.length > 0 ? { detallesErrores: errors } : {}),
  };
}

// ─── Actualizar ajustes manuales ──────────────────────────
export async function update(id: string, data: UpdateNomina, v: ViewerContext) {
  if (!canWriteAll(v)) throw new ForbiddenError('Sin permiso para editar nóminas');

  const nomina = await prisma.nomina.findUnique({ where: { id } });
  if (!nomina) throw new NotFoundError('Nómina no encontrada');

  if (!['CALCULADO', 'PENDIENTE'].includes(nomina.estado)) {
    throw new ConflictError(`No se puede editar una nómina en estado ${nomina.estado}`);
  }

  const descuentos = data.descuentos ?? nomina.descuentos;
  const bonos      = data.bonos      ?? nomina.bonos;
  const sueldoNeto = nomina.sueldoBruto - nomina.aportePersonal - descuentos + bonos;

  try {
    return await prisma.nomina.update({
      where: { id },
      data:  { ...data, sueldoNeto },
      include: INCLUDE_BASE,
    });
  } catch (err) {
    handleDbError(err);
  }
}

// ─── Aprobar ──────────────────────────────────────────────
export async function aprobar(id: string, v: ViewerContext) {
  if (!isPrivileged(v)) throw new ForbiddenError('Solo ADMIN o RRHH pueden aprobar nóminas');

  const nomina = await prisma.nomina.findUnique({ where: { id } });
  if (!nomina) throw new NotFoundError('Nómina no encontrada');

  if (nomina.estado !== 'CALCULADO') {
    throw new ConflictError(`Solo se puede aprobar una nómina en estado CALCULADO (actual: ${nomina.estado})`);
  }

  return prisma.nomina.update({
    where: { id },
    data:  { estado: 'APROBADO' },
    include: INCLUDE_BASE,
  });
}

// ─── Marcar pagada ────────────────────────────────────────
export async function pagar(id: string, input: PagarNomina, v: ViewerContext) {
  if (!isPrivileged(v)) throw new ForbiddenError('Solo ADMIN o RRHH pueden marcar nóminas como pagadas');

  const nomina = await prisma.nomina.findUnique({ where: { id } });
  if (!nomina) throw new NotFoundError('Nómina no encontrada');

  if (nomina.estado !== 'APROBADO') {
    throw new ConflictError('Solo se puede pagar una nómina en estado APROBADO');
  }

  return prisma.nomina.update({
    where: { id },
    data:  { estado: 'PAGADO', fechaPago: input.fechaPago },
    include: INCLUDE_BASE,
  });
}

// ─── Eliminar ─────────────────────────────────────────────
export async function remove(id: string, v: ViewerContext) {
  if (!isPrivileged(v)) throw new ForbiddenError('Sin permiso para eliminar nóminas');

  const nomina = await prisma.nomina.findUnique({ where: { id } });
  if (!nomina) throw new NotFoundError('Nómina no encontrada');

  if (nomina.estado !== 'CALCULADO') {
    throw new ConflictError('Solo se pueden eliminar nóminas en estado CALCULADO');
  }

  return prisma.nomina.delete({ where: { id } });
}
