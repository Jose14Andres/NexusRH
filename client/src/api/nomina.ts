import api from './axios';

export type EstadoNomina = 'PENDIENTE' | 'CALCULADO' | 'APROBADO' | 'PAGADO';

export interface Nomina {
  id: string;
  empleadoId: string;
  mes: number;
  anio: number;
  sueldoBruto: number;
  aportePersonal: number;
  aportePatronal: number;
  fondosReserva: number;
  decimoTercero: number;
  decimoCuarto: number;
  descuentos: number;
  bonos: number;
  horasExtrasValor: number;
  horasExtrasQty: number;
  sueldoNeto: number;
  fechaPago?: string | null;
  estado: EstadoNomina;
  observaciones?: string | null;
  createdAt: string;
  updatedAt: string;
  empleado: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    departamento: { id: string; nombre: string };
    cargo: { id: string; nombre: string; sueldoBase: number };
  };
}

export interface ListNominaResp {
  data: Nomina[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CalcularResult {
  calculadas: number;
  errores: number;
  mes: number;
  anio: number;
  detallesErrores?: Array<{ empleadoId: string; error: string }>;
}

export const nominaApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ListNominaResp>('/nomina', { params }).then(r => r.data),

  getOne: (id: string) =>
    api.get<Nomina>(`/nomina/${id}`).then(r => r.data),

  calcular: (data: { mes: number; anio: number }) =>
    api.post<CalcularResult>('/nomina/calcular', data).then(r => r.data),

  update: (id: string, data: { descuentos?: number; bonos?: number; observaciones?: string }) =>
    api.put<Nomina>(`/nomina/${id}`, data).then(r => r.data),

  aprobar: (id: string) =>
    api.post<Nomina>(`/nomina/${id}/aprobar`).then(r => r.data),

  pagar: (id: string, fechaPago: string) =>
    api.post<Nomina>(`/nomina/${id}/pagar`, { fechaPago }).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/nomina/${id}`).then(r => r.data),
};
