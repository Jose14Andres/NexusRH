import { prisma } from '../../lib/prisma';
import { ExportDataset } from '../../lib/exporters';
import {
  ExportEmpleadosQuery,
  ExportHorasQuery,
  ExportNominaQuery,
} from './exportacion.schemas';

export type ViewerContext = {
  roles: string[];
  sub: string;
  empleadoId?: string | null;
  departamentoId?: string | null;
};

const CAN_READ_ALL = ['ADMIN', 'RRHH', 'CONTABILIDAD'];

function canReadAll(v: ViewerContext): boolean {
  return v.roles.some(r => CAN_READ_ALL.includes(r));
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function nombrePeriodo(mes?: number, anio?: number): string {
  if (mes && anio) return `${MESES[mes - 1]} ${anio}`;
  if (anio) return `Año ${anio}`;
  return 'Todos los períodos';
}

// ─── Empleados ────────────────────────────────────────────

export async function buildEmpleadosDataset(
  query: ExportEmpleadosQuery,
  v: ViewerContext,
): Promise<ExportDataset> {
  const where = {
    ...(query.estado         ? { estado: query.estado }                 : {}),
    ...(query.departamentoId ? { departamentoId: query.departamentoId } : {}),
    ...(query.cargoId        ? { cargoId: query.cargoId }               : {}),
  };

  const empleados = await prisma.empleado.findMany({
    where,
    orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
    include: {
      departamento: { select: { nombre: true } },
      cargo:        { select: { nombre: true, sueldoBase: true } },
      afiliacion:   { select: { asegurado: true, tipoSeguro: true } },
    },
  });

  const rows = empleados.map(e => ({
    cedula:       e.cedula,
    apellidos:    e.apellidos,
    nombres:      e.nombres,
    email:        e.email,
    telefono:     e.telefono ?? '',
    departamento: e.departamento.nombre,
    cargo:        e.cargo.nombre,
    sueldoBase:   e.cargo.sueldoBase,
    estado:       e.estado,
    fechaIngreso: e.fechaIngreso,
    afiliado:     e.afiliacion?.asegurado ? 'Sí' : 'No',
    tipoSeguro:   e.afiliacion?.tipoSeguro ?? 'NINGUNO',
  }));

  return {
    title: 'Empleados',
    subtitle: `${rows.length} empleado(s)` + (query.estado ? ` · estado: ${query.estado}` : ''),
    columns: [
      { key: 'cedula',       header: 'Cédula',        width: 12 },
      { key: 'apellidos',    header: 'Apellidos',     width: 18 },
      { key: 'nombres',      header: 'Nombres',       width: 18 },
      { key: 'email',        header: 'Email',         width: 22 },
      { key: 'telefono',     header: 'Teléfono',      width: 12 },
      { key: 'departamento', header: 'Departamento',  width: 18 },
      { key: 'cargo',        header: 'Cargo',         width: 18 },
      { key: 'sueldoBase',   header: 'Sueldo Base',   width: 12, format: 'currency' },
      { key: 'estado',       header: 'Estado',        width: 10 },
      { key: 'fechaIngreso', header: 'Fecha Ingreso', width: 12, format: 'date' },
      { key: 'afiliado',     header: 'Afiliado',      width: 8 },
      { key: 'tipoSeguro',   header: 'Tipo Seguro',   width: 10 },
    ],
    rows,
  };
}

// ─── Horas ────────────────────────────────────────────────

export async function buildHorasDataset(
  query: ExportHorasQuery,
  v: ViewerContext,
): Promise<ExportDataset> {
  // EMPLEADO/SUPERVISOR sin rol privilegiado quedan acotados a sí mismos
  const scopedEmpleadoId = canReadAll(v) ? query.empleadoId : (v.empleadoId ?? '__none__');

  const fechaFilter =
    query.desde || query.hasta
      ? { fecha: { ...(query.desde ? { gte: query.desde } : {}), ...(query.hasta ? { lte: query.hasta } : {}) } }
      : {};

  const where = {
    ...(query.estado     ? { estado: query.estado }         : {}),
    ...(scopedEmpleadoId ? { empleadoId: scopedEmpleadoId } : {}),
    ...fechaFilter,
  };

  const registros = await prisma.registroHoras.findMany({
    where,
    orderBy: [{ fecha: 'desc' }],
    include: {
      empleado: {
        select: {
          nombres: true,
          apellidos: true,
          cedula: true,
          departamento: { select: { nombre: true } },
        },
      },
    },
  });

  const rows = registros.map(r => ({
    fecha:         r.fecha,
    cedula:        r.empleado.cedula,
    empleado:      `${r.empleado.apellidos} ${r.empleado.nombres}`,
    departamento:  r.empleado.departamento.nombre,
    horasNormales: r.horasNormales,
    horasExtras:   r.horasExtras,
    estado:        r.estado,
    observacion:   r.observacion ?? '',
  }));

  return {
    title: 'Registro de Horas',
    subtitle: `${rows.length} registro(s)` + (query.estado ? ` · estado: ${query.estado}` : ''),
    columns: [
      { key: 'fecha',         header: 'Fecha',          width: 12, format: 'date' },
      { key: 'cedula',        header: 'Cédula',         width: 12 },
      { key: 'empleado',      header: 'Empleado',       width: 22 },
      { key: 'departamento',  header: 'Departamento',   width: 18 },
      { key: 'horasNormales', header: 'Horas Normales', width: 12, format: 'number' },
      { key: 'horasExtras',   header: 'Horas Extras',   width: 12, format: 'number' },
      { key: 'estado',        header: 'Estado',         width: 12 },
      { key: 'observacion',   header: 'Observación',    width: 24 },
    ],
    rows,
  };
}

// ─── Nómina ───────────────────────────────────────────────

export async function buildNominaDataset(
  query: ExportNominaQuery,
  v: ViewerContext,
): Promise<ExportDataset> {
  // EMPLEADO solo puede exportar su propia nómina
  const scopedEmpleadoId = canReadAll(v) ? query.empleadoId : (v.empleadoId ?? '__none__');

  const where = {
    ...(query.mes        ? { mes: query.mes }               : {}),
    ...(query.anio       ? { anio: query.anio }             : {}),
    ...(query.estado     ? { estado: query.estado }         : {}),
    ...(scopedEmpleadoId ? { empleadoId: scopedEmpleadoId } : {}),
  };

  const nominas = await prisma.nomina.findMany({
    where,
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { empleadoId: 'asc' }],
    include: {
      empleado: {
        select: {
          nombres: true,
          apellidos: true,
          cedula: true,
          departamento: { select: { nombre: true } },
          cargo:        { select: { nombre: true } },
        },
      },
    },
  });

  const rows = nominas.map(n => ({
    periodo:          `${String(n.mes).padStart(2, '0')}/${n.anio}`,
    cedula:           n.empleado.cedula,
    empleado:         `${n.empleado.apellidos} ${n.empleado.nombres}`,
    departamento:     n.empleado.departamento.nombre,
    cargo:            n.empleado.cargo.nombre,
    sueldoBruto:      n.sueldoBruto,
    horasExtrasValor: n.horasExtrasValor,
    aportePersonal:   n.aportePersonal,
    aportePatronal:   n.aportePatronal,
    fondosReserva:    n.fondosReserva,
    decimoTercero:    n.decimoTercero,
    decimoCuarto:     n.decimoCuarto,
    descuentos:       n.descuentos,
    bonos:            n.bonos,
    sueldoNeto:       n.sueldoNeto,
    estado:           n.estado,
    fechaPago:        n.fechaPago,
  }));

  return {
    title: `Nómina ${nombrePeriodo(query.mes, query.anio)}`,
    subtitle: `${rows.length} registro(s)` + (query.estado ? ` · estado: ${query.estado}` : ''),
    columns: [
      { key: 'periodo',          header: 'Período',         width: 8 },
      { key: 'cedula',           header: 'Cédula',          width: 11 },
      { key: 'empleado',         header: 'Empleado',        width: 20 },
      { key: 'departamento',     header: 'Departamento',    width: 14 },
      { key: 'cargo',            header: 'Cargo',           width: 14 },
      { key: 'sueldoBruto',      header: 'Sueldo Bruto',    width: 11, format: 'currency' },
      { key: 'horasExtrasValor', header: 'Horas Extra',     width: 11, format: 'currency' },
      { key: 'aportePersonal',   header: 'Aporte Personal', width: 11, format: 'currency' },
      { key: 'aportePatronal',   header: 'Aporte Patronal', width: 11, format: 'currency' },
      { key: 'fondosReserva',    header: 'Fondos Reserva',  width: 11, format: 'currency' },
      { key: 'decimoTercero',    header: '13er Sueldo',     width: 10, format: 'currency' },
      { key: 'decimoCuarto',     header: '14to Sueldo',     width: 10, format: 'currency' },
      { key: 'descuentos',       header: 'Descuentos',      width: 10, format: 'currency' },
      { key: 'bonos',            header: 'Bonos',           width: 9,  format: 'currency' },
      { key: 'sueldoNeto',       header: 'Sueldo Neto',     width: 11, format: 'currency' },
      { key: 'estado',           header: 'Estado',          width: 10 },
      { key: 'fechaPago',        header: 'Fecha Pago',      width: 11, format: 'date' },
    ],
    rows,
  };
}
