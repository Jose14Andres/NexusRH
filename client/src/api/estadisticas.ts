import api from './axios';

// ─── Types ────────────────────────────────────────────────

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

export interface HistorialSalarialItem {
  periodo: string;
  label: string;
  sueldoBruto: number;
  sueldoNeto: number;
  aportePersonal: number;
  horasExtrasValor: number;
  bonos: number;
  descuentos: number;
  estado: string | null;
}

export interface HorasMesItem {
  mes: number;
  label: string;
  horasNormales: number;
  horasExtras: number;
}

export interface AportacionesData {
  anio: number;
  empleadoId: string | null;
  totalAportePersonal: number;
  totalAportePatronal: number;
  detalle: Array<{ mes: number; label: string; aportePersonal: number; aportePatronal: number }>;
}

export interface CostoDeptItem {
  departamentoId: string;
  departamento: string;
  totalBruto: number;
  totalNeto: number;
  totalPatronal: number;
  cantEmpleados: number;
}

export interface AfiliacionData {
  total: number;
  conIESS: number;
  sinIESS: number;
  pctIESS: number;
}

export interface DistribucionCargoItem {
  cargo: string;
  departamento: string;
  cantidad: number;
}

export interface EvolucionMesItem {
  mes: number;
  label: string;
  totalBruto: number;
  totalNeto: number;
  cantEmpleados: number;
}

// ─── API ──────────────────────────────────────────────────

export const estadisticasApi = {
  getDashboard: () =>
    api.get<DashboardData>('/estadisticas/dashboard').then(r => r.data),

  historialSalarial: (params?: { empleadoId?: string; ultimos?: number }) =>
    api.get<HistorialSalarialItem[]>('/estadisticas/individual/historial-salarial', { params }).then(r => r.data),

  horas: (params?: { empleadoId?: string; anio?: number }) =>
    api.get<HorasMesItem[]>('/estadisticas/individual/horas', { params }).then(r => r.data),

  aportaciones: (params?: { empleadoId?: string; anio?: number }) =>
    api.get<AportacionesData>('/estadisticas/individual/aportaciones', { params }).then(r => r.data),

  costoDepartamento: (params: { mes: number; anio: number; departamentoId?: string }) =>
    api.get<CostoDeptItem[]>('/estadisticas/organizacion/costo-departamento', { params }).then(r => r.data),

  afiliacion: () =>
    api.get<AfiliacionData>('/estadisticas/organizacion/afiliacion').then(r => r.data),

  distribucionCargos: () =>
    api.get<DistribucionCargoItem[]>('/estadisticas/organizacion/distribucion-cargos').then(r => r.data),

  evolucionNomina: (params?: { anio?: number; departamentoId?: string }) =>
    api.get<EvolucionMesItem[]>('/estadisticas/organizacion/evolucion-nomina', { params }).then(r => r.data),
};
