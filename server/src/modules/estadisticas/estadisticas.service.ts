import { prisma } from '../../lib/prisma';
import { ForbiddenError } from '../../lib/errors';
import {
  HistorialSalarialQuery,
  HorasQuery,
  AportacionesQuery,
  CostoDepartamentoQuery,
  EvolucionNominaQuery,
} from './estadisticas.schemas';

export type ViewerContext = {
  roles: string[];
  sub: string;
  empleadoId?: string | null;
  departamentoId?: string | null;
};

const ORG_ROLES  = ['ADMIN', 'RRHH', 'CONTABILIDAD'];
const DEPT_ROLES = ['ADMIN', 'RRHH', 'CONTABILIDAD', 'SUPERVISOR'];

// ─── Scope builders puros (exportados para tests) ────────

/** Devuelve el empleadoId efectivo para queries individuales.
 *  EMPLEADO/SUPERVISOR → forzado al propio ID; privilegiados → respetan el query. */
export function resolveIndividualEmpleadoId(
  queryId: string | undefined,
  v: ViewerContext,
): string | undefined {
  if (v.roles.some(r => ORG_ROLES.includes(r))) return queryId;
  // SUPERVISOR y EMPLEADO solo pueden ver sus propios datos individuales
  return v.empleadoId ?? undefined;
}

/** Devuelve el departamentoId efectivo para queries de departamento.
 *  EMPLEADO → ForbiddenError; SUPERVISOR → forzado al suyo; privilegiados → respetan query. */
export function resolveDeptFilter(
  queryDeptId: string | undefined,
  v: ViewerContext,
): string | undefined {
  if (v.roles.some(r => ORG_ROLES.includes(r))) return queryDeptId;
  if (v.roles.includes('SUPERVISOR')) return v.departamentoId ?? undefined;
  throw new ForbiddenError('Sin acceso a estadísticas de departamento');
}

/** Lanza ForbiddenError si el viewer no tiene acceso organizacional. */
export function assertCanReadOrg(v: ViewerContext): void {
  if (!v.roles.some(r => ORG_ROLES.includes(r))) {
    throw new ForbiddenError('Sin acceso a estadísticas organizacionales');
  }
}

/** Convierte mes/año a etiqueta "YYYY-MM" para ejes de gráficos. */
export function normalizePeriodo(mes: number, anio: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

// ─── Helpers privados ─────────────────────────────────────

const MESES_LABEL = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic',
];

/** Genera los N períodos anteriores (incluyendo el actual) más recientes primero → luego revertidos. */
function ultimosPeriodos(n: number): Array<{ mes: number; anio: number }> {
  const ahora = new Date();
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    result.push({ mes: d.getMonth() + 1, anio: d.getFullYear() });
  }
  return result;
}

// ─── Dashboard ────────────────────────────────────────────

export interface KpiItem {
  key: string;
  label: string;
  value: number;
  format: 'currency' | 'number' | 'percent';
  description?: string;
}

export interface DashboardData {
  kpis: KpiItem[];
  charts: {
    evolucionNomina: Array<{ periodo: string; label: string; totalNeto: number; totalBruto: number }>;
    distribucionDept: Array<{ departamento: string; cantidad: number }>;
  };
}

export async function getDashboard(v: ViewerContext): Promise<DashboardData> {
  const ahora = new Date();
  const mes  = ahora.getMonth() + 1;
  const anio = ahora.getFullYear();

  if (v.roles.some(r => ['ADMIN', 'RRHH'].includes(r))) {
    return buildOrgDashboard(mes, anio);
  }
  if (v.roles.includes('CONTABILIDAD')) {
    return buildContabilidadDashboard(mes, anio);
  }
  if (v.roles.includes('SUPERVISOR')) {
    return buildSupervisorDashboard(mes, anio, v);
  }
  return buildEmpleadoDashboard(mes, anio, v);
}

async function buildOrgDashboard(mes: number, anio: number): Promise<DashboardData> {
  const [
    totalActivos,
    enLicencia,
    horasPendientes,
    nominaCalculadas,
    nominaMes,
    totalAfiliados,
  ] = await Promise.all([
    prisma.empleado.count({ where: { estado: 'ACTIVO' } }),
    prisma.empleado.count({ where: { estado: 'LICENCIA' } }),
    prisma.registroHoras.count({ where: { estado: 'PENDIENTE' } }),
    prisma.nomina.count({ where: { mes, anio, estado: 'CALCULADO' } }),
    prisma.nomina.aggregate({ where: { mes, anio }, _sum: { sueldoNeto: true } }),
    prisma.afiliacion.count({ where: { asegurado: true, tipoSeguro: 'IESS' } }),
  ]);

  const costoMes = nominaMes._sum.sueldoNeto ?? 0;

  const [evolucionNomina, distribucionDept] = await Promise.all([
    buildMiniEvolucion(6, undefined),
    buildDistribucionDept(),
  ]);

  return {
    kpis: [
      { key: 'empleados',       label: 'Empleados activos',   value: totalActivos,      format: 'number' },
      { key: 'costoNomina',     label: 'Costo nómina (mes)',  value: costoMes,           format: 'currency' },
      { key: 'horasPendientes', label: 'Horas por aprobar',   value: horasPendientes,   format: 'number' },
      { key: 'nominaPendiente', label: 'Nóminas por aprobar', value: nominaCalculadas,  format: 'number' },
      { key: 'enLicencia',      label: 'En licencia',         value: enLicencia,        format: 'number' },
      { key: 'afiliados',       label: 'Afiliados IESS',      value: totalAfiliados,    format: 'number' },
    ],
    charts: { evolucionNomina, distribucionDept },
  };
}

async function buildContabilidadDashboard(mes: number, anio: number): Promise<DashboardData> {
  const mesPrev  = mes === 1 ? 12 : mes - 1;
  const anioPrev = mes === 1 ? anio - 1 : anio;

  const [nominaMes, nominaPrev, pagosAprobados, pagosPagados] = await Promise.all([
    prisma.nomina.aggregate({ where: { mes, anio },               _sum: { sueldoNeto: true } }),
    prisma.nomina.aggregate({ where: { mes: mesPrev, anio: anioPrev }, _sum: { sueldoNeto: true } }),
    prisma.nomina.count({ where: { mes, anio, estado: 'APROBADO' } }),
    prisma.nomina.count({ where: { mes, anio, estado: 'PAGADO'   } }),
  ]);

  const costoMes  = nominaMes._sum.sueldoNeto  ?? 0;
  const costoPrev = nominaPrev._sum.sueldoNeto ?? 0;
  const crecimiento = costoPrev > 0 ? ((costoMes - costoPrev) / costoPrev) * 100 : 0;

  const [evolucionNomina, distribucionDept] = await Promise.all([
    buildMiniEvolucion(6, undefined),
    buildDistribucionDept(),
  ]);

  return {
    kpis: [
      { key: 'costoMes',     label: 'Nómina total (mes)',     value: costoMes,     format: 'currency' },
      { key: 'pendientes',   label: 'Pagos pendientes',       value: pagosAprobados, format: 'number' },
      { key: 'completados',  label: 'Pagos completados',      value: pagosPagados, format: 'number' },
      { key: 'crecimiento',  label: 'Crecimiento vs mes ant', value: parseFloat(crecimiento.toFixed(1)), format: 'percent' },
    ],
    charts: { evolucionNomina, distribucionDept },
  };
}

async function buildSupervisorDashboard(mes: number, anio: number, v: ViewerContext): Promise<DashboardData> {
  const deptId = v.departamentoId;

  const [empleadosDept, horasPendientesDept, nominaDept, enLicenciaDept] = await Promise.all([
    prisma.empleado.count({ where: { departamentoId: deptId ?? undefined, estado: 'ACTIVO' } }),
    prisma.registroHoras.count({
      where: { estado: 'PENDIENTE', empleado: { departamentoId: deptId ?? undefined } },
    }),
    prisma.nomina.aggregate({
      where: { mes, anio, empleado: { departamentoId: deptId ?? undefined } },
      _sum: { sueldoBruto: true },
    }),
    prisma.empleado.count({ where: { departamentoId: deptId ?? undefined, estado: 'LICENCIA' } }),
  ]);

  const [evolucionNomina, distribucionDept] = await Promise.all([
    buildMiniEvolucion(6, deptId ?? undefined),
    buildDistribucionDept(deptId ?? undefined),
  ]);

  return {
    kpis: [
      { key: 'miDept',      label: 'Mi departamento',      value: empleadosDept,                          format: 'number' },
      { key: 'pendientes',  label: 'Horas por aprobar',    value: horasPendientesDept,                    format: 'number' },
      { key: 'costoMes',    label: 'Costo nómina dept',    value: nominaDept._sum.sueldoBruto ?? 0,       format: 'currency' },
      { key: 'licencias',   label: 'En licencia',          value: enLicenciaDept,                         format: 'number' },
    ],
    charts: { evolucionNomina, distribucionDept },
  };
}

async function buildEmpleadoDashboard(mes: number, anio: number, v: ViewerContext): Promise<DashboardData> {
  const empId = v.empleadoId;

  const ahora  = new Date();
  const mesHoras = ahora.getMonth() + 1;
  const anioHoras = ahora.getFullYear();
  const desde = new Date(anioHoras, mesHoras - 1, 1);
  const hasta = new Date(anioHoras, mesHoras, 1);

  const [ultimaNomina, horasMes, recibos] = await Promise.all([
    prisma.nomina.findFirst({
      where: { empleadoId: empId ?? undefined },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      select: { sueldoNeto: true, mes: true, anio: true },
    }),
    prisma.registroHoras.aggregate({
      where: {
        empleadoId: empId ?? undefined,
        estado: 'APROBADO',
        fecha: { gte: desde, lt: hasta },
      },
      _sum: { horasNormales: true, horasExtras: true },
    }),
    prisma.nomina.count({
      where: { empleadoId: empId ?? undefined, estado: { in: ['APROBADO', 'PAGADO'] } },
    }),
  ]);

  const [evolucionNomina] = await Promise.all([
    buildMiniEvolucionIndividual(6, empId ?? undefined),
  ]);

  return {
    kpis: [
      { key: 'sueldoNeto',  label: 'Mi último sueldo neto', value: ultimaNomina?.sueldoNeto ?? 0, format: 'currency' },
      { key: 'horasNorm',   label: 'Horas normales (mes)',  value: horasMes._sum.horasNormales ?? 0, format: 'number' },
      { key: 'horasExtra',  label: 'Horas extra (mes)',     value: horasMes._sum.horasExtras   ?? 0, format: 'number' },
      { key: 'recibos',     label: 'Recibos disponibles',   value: recibos,                          format: 'number' },
    ],
    charts: {
      evolucionNomina,
      distribucionDept: [],
    },
  };
}

async function buildMiniEvolucion(
  meses: number,
  deptId: string | undefined,
): Promise<Array<{ periodo: string; label: string; totalNeto: number; totalBruto: number }>> {
  const periodos = ultimosPeriodos(meses);
  const nominas = await prisma.nomina.findMany({
    where: {
      OR: periodos.map(p => ({ mes: p.mes, anio: p.anio })),
      ...(deptId ? { empleado: { departamentoId: deptId } } : {}),
    },
    select: { mes: true, anio: true, sueldoNeto: true, sueldoBruto: true },
  });

  return periodos.map(p => {
    const matching = nominas.filter(n => n.mes === p.mes && n.anio === p.anio);
    return {
      periodo: normalizePeriodo(p.mes, p.anio),
      label:   `${MESES_LABEL[p.mes - 1]} ${p.anio}`,
      totalNeto:  matching.reduce((s, n) => s + n.sueldoNeto,  0),
      totalBruto: matching.reduce((s, n) => s + n.sueldoBruto, 0),
    };
  });
}

async function buildMiniEvolucionIndividual(
  meses: number,
  empleadoId: string | undefined,
): Promise<Array<{ periodo: string; label: string; totalNeto: number; totalBruto: number }>> {
  if (!empleadoId) return [];
  const periodos = ultimosPeriodos(meses);
  const nominas = await prisma.nomina.findMany({
    where: {
      empleadoId,
      OR: periodos.map(p => ({ mes: p.mes, anio: p.anio })),
    },
    select: { mes: true, anio: true, sueldoNeto: true, sueldoBruto: true },
  });

  return periodos.map(p => {
    const n = nominas.find(x => x.mes === p.mes && x.anio === p.anio);
    return {
      periodo: normalizePeriodo(p.mes, p.anio),
      label:   `${MESES_LABEL[p.mes - 1]} ${p.anio}`,
      totalNeto:  n?.sueldoNeto  ?? 0,
      totalBruto: n?.sueldoBruto ?? 0,
    };
  });
}

async function buildDistribucionDept(
  deptId?: string,
): Promise<Array<{ departamento: string; cantidad: number }>> {
  const empleados = await prisma.empleado.findMany({
    where: {
      estado: 'ACTIVO',
      ...(deptId ? { departamentoId: deptId } : {}),
    },
    select: { departamento: { select: { nombre: true } } },
  });

  const map = new Map<string, number>();
  for (const e of empleados) {
    const nombre = e.departamento.nombre;
    map.set(nombre, (map.get(nombre) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([departamento, cantidad]) => ({ departamento, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

// ─── Individual: historial salarial ──────────────────────

export async function historialSalarial(q: HistorialSalarialQuery, v: ViewerContext) {
  const empleadoId = resolveIndividualEmpleadoId(q.empleadoId, v);
  const periodos = ultimosPeriodos(q.ultimos);

  const nominas = await prisma.nomina.findMany({
    where: {
      ...(empleadoId ? { empleadoId } : {}),
      OR: periodos.map(p => ({ mes: p.mes, anio: p.anio })),
    },
    select: {
      mes: true, anio: true,
      sueldoBruto: true, sueldoNeto: true, aportePersonal: true,
      horasExtrasValor: true, bonos: true, descuentos: true,
      estado: true,
      empleado: { select: { id: true, nombres: true, apellidos: true } },
    },
    orderBy: [{ anio: 'asc' }, { mes: 'asc' }],
  });

  return periodos.map(p => {
    const n = nominas.find(x => x.mes === p.mes && x.anio === p.anio);
    return {
      periodo: normalizePeriodo(p.mes, p.anio),
      label:   `${MESES_LABEL[p.mes - 1]} ${p.anio}`,
      sueldoBruto:     n?.sueldoBruto     ?? 0,
      sueldoNeto:      n?.sueldoNeto      ?? 0,
      aportePersonal:  n?.aportePersonal  ?? 0,
      horasExtrasValor: n?.horasExtrasValor ?? 0,
      bonos:           n?.bonos           ?? 0,
      descuentos:      n?.descuentos      ?? 0,
      estado:          n?.estado          ?? null,
      empleado:        n?.empleado        ?? null,
    };
  });
}

// ─── Individual: horas por mes ───────────────────────────

export async function horasPorMes(q: HorasQuery, v: ViewerContext) {
  const empleadoId = resolveIndividualEmpleadoId(q.empleadoId, v);
  const desde = new Date(q.anio, 0, 1);
  const hasta = new Date(q.anio + 1, 0, 1);

  const registros = await prisma.registroHoras.findMany({
    where: {
      ...(empleadoId ? { empleadoId } : {}),
      fecha: { gte: desde, lt: hasta },
      estado: 'APROBADO',
    },
    select: { fecha: true, horasNormales: true, horasExtras: true },
  });

  return Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const del_mes = registros.filter(r => new Date(r.fecha).getMonth() + 1 === mes);
    return {
      mes,
      label:         MESES_LABEL[i],
      horasNormales: del_mes.reduce((s, r) => s + r.horasNormales, 0),
      horasExtras:   del_mes.reduce((s, r) => s + r.horasExtras,   0),
    };
  });
}

// ─── Individual: aportaciones IESS ───────────────────────

export async function aportaciones(q: AportacionesQuery, v: ViewerContext) {
  const empleadoId = resolveIndividualEmpleadoId(q.empleadoId, v);

  const nominas = await prisma.nomina.findMany({
    where: { ...(empleadoId ? { empleadoId } : {}), anio: q.anio },
    select: { mes: true, aportePersonal: true, aportePatronal: true },
    orderBy: { mes: 'asc' },
  });

  const detalle = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const n = nominas.find(x => x.mes === mes);
    return {
      mes,
      label:          MESES_LABEL[i],
      aportePersonal: n?.aportePersonal ?? 0,
      aportePatronal: n?.aportePatronal ?? 0,
    };
  });

  return {
    anio: q.anio,
    empleadoId: empleadoId ?? null,
    totalAportePersonal: detalle.reduce((s, d) => s + d.aportePersonal, 0),
    totalAportePatronal: detalle.reduce((s, d) => s + d.aportePatronal, 0),
    detalle,
  };
}

// ─── Org: costo de nómina por departamento ────────────────

export async function costoDepartamento(q: CostoDepartamentoQuery, v: ViewerContext) {
  const deptId = resolveDeptFilter(q.departamentoId, v);

  const nominas = await prisma.nomina.findMany({
    where: {
      mes: q.mes,
      anio: q.anio,
      ...(deptId ? { empleado: { departamentoId: deptId } } : {}),
    },
    select: {
      sueldoBruto: true, sueldoNeto: true, aportePatronal: true,
      empleado: { select: { departamento: { select: { id: true, nombre: true } } } },
    },
  });

  const map = new Map<string, {
    departamentoId: string; departamento: string;
    totalBruto: number; totalNeto: number; totalPatronal: number; cantEmpleados: number;
  }>();

  for (const n of nominas) {
    const { id, nombre } = n.empleado.departamento;
    const entry = map.get(id) ?? {
      departamentoId: id, departamento: nombre,
      totalBruto: 0, totalNeto: 0, totalPatronal: 0, cantEmpleados: 0,
    };
    entry.totalBruto    += n.sueldoBruto;
    entry.totalNeto     += n.sueldoNeto;
    entry.totalPatronal += n.aportePatronal;
    entry.cantEmpleados += 1;
    map.set(id, entry);
  }

  return [...map.values()].sort((a, b) => b.totalBruto - a.totalBruto);
}

// ─── Org: distribución afiliación ────────────────────────

export async function afiliacion(v: ViewerContext) {
  assertCanReadOrg(v);

  const [total, conIESS] = await Promise.all([
    prisma.empleado.count({ where: { estado: 'ACTIVO' } }),
    prisma.empleado.count({
      where: { estado: 'ACTIVO', afiliacion: { asegurado: true, tipoSeguro: 'IESS' } },
    }),
  ]);

  const sinIESS = total - conIESS;
  return {
    total,
    conIESS,
    sinIESS,
    pctIESS: total > 0 ? parseFloat(((conIESS / total) * 100).toFixed(1)) : 0,
  };
}

// ─── Org: distribución por cargo ─────────────────────────

export async function distribucionCargos(v: ViewerContext) {
  assertCanReadOrg(v);

  const empleados = await prisma.empleado.findMany({
    where: { estado: 'ACTIVO' },
    select: {
      cargo:       { select: { id: true, nombre: true } },
      departamento: { select: { nombre: true } },
    },
  });

  const map = new Map<string, { cargo: string; departamento: string; cantidad: number }>();
  for (const e of empleados) {
    const key = e.cargo.id;
    const entry = map.get(key) ?? { cargo: e.cargo.nombre, departamento: e.departamento.nombre, cantidad: 0 };
    entry.cantidad++;
    map.set(key, entry);
  }

  return [...map.values()].sort((a, b) => b.cantidad - a.cantidad);
}

// ─── Org: evolución mensual de nómina ────────────────────

export async function evolucionNomina(q: EvolucionNominaQuery, v: ViewerContext) {
  const deptId = resolveDeptFilter(q.departamentoId, v);

  const nominas = await prisma.nomina.findMany({
    where: {
      anio: q.anio,
      ...(deptId ? { empleado: { departamentoId: deptId } } : {}),
    },
    select: { mes: true, sueldoBruto: true, sueldoNeto: true },
  });

  return Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    const del_mes = nominas.filter(n => n.mes === mes);
    return {
      mes,
      label:         MESES_LABEL[i],
      totalBruto:    del_mes.reduce((s, n) => s + n.sueldoBruto, 0),
      totalNeto:     del_mes.reduce((s, n) => s + n.sueldoNeto,  0),
      cantEmpleados: del_mes.length,
    };
  });
}
