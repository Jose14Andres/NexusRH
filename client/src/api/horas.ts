import api from './axios';

export type EstadoHoras = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface RegistroHoras {
  id: string;
  empleadoId: string;
  fecha: string;
  horasNormales: number;
  horasExtras: number;
  observacion?: string | null;
  estado: EstadoHoras;
  aprobadoPor?: string | null;
  aprobadoAt?: string | null;
  motivoRechazo?: string | null;
  createdAt: string;
  empleado: {
    id: string;
    nombres: string;
    apellidos: string;
    cedula: string;
    departamento: { id: string; nombre: string };
    cargo: { id: string; nombre: string };
  };
}

export interface ListHorasResp {
  data: RegistroHoras[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ResumenHoras {
  mes: number;
  anio: number;
  empleadoId: string | null;
  horasNormales: number;
  horasExtras: number;
  totalRegistros: number;
  detalle: Array<{
    id: string;
    empleadoId: string;
    fecha: string;
    horasNormales: number;
    horasExtras: number;
    estado: string;
  }>;
}

export interface CreateHorasDto {
  empleadoId: string;
  fecha: string;
  horasNormales: number;
  horasExtras: number;
  observacion?: string;
}

export const horasApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ListHorasResp>('/horas', { params }).then(r => r.data),

  pendientes: () =>
    api.get<RegistroHoras[]>('/horas/pendientes').then(r => r.data),

  resumen: (params: { empleadoId?: string; mes: number; anio: number }) =>
    api.get<ResumenHoras>('/horas/resumen', { params }).then(r => r.data),

  getOne: (id: string) =>
    api.get<RegistroHoras>(`/horas/${id}`).then(r => r.data),

  create: (data: CreateHorasDto) =>
    api.post<RegistroHoras>('/horas', data).then(r => r.data),

  update: (id: string, data: Partial<Omit<CreateHorasDto, 'empleadoId' | 'fecha'>>) =>
    api.put<RegistroHoras>(`/horas/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/horas/${id}`).then(r => r.data),

  aprobar: (id: string) =>
    api.post<RegistroHoras>(`/horas/${id}/aprobar`).then(r => r.data),

  rechazar: (id: string, motivoRechazo: string) =>
    api.post<RegistroHoras>(`/horas/${id}/rechazar`, { motivoRechazo }).then(r => r.data),
};
