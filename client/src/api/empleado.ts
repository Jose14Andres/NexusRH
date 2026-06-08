import api from './axios';

export interface Afiliacion {
  id?: string;
  empleadoId: string;
  asegurado: boolean;
  numeroAfiliacion?: string | null;
  tipoSeguro: 'IESS' | 'PRIVADO' | 'NINGUNO';
  fechaAfiliacion?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Empleado {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string | null;
  fechaIngreso: string;
  fechaSalida?: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'LICENCIA';
  cargoId: string;
  departamentoId: string;
  cargo: { id: string; nombre: string; sueldoBase: number };
  departamento: { id: string; nombre: string };
  afiliacion?: Afiliacion | null;
  usuario?: { id: string; username: string; activo: boolean } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListEmpleadosResp {
  data: Empleado[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateEmpleadoDto {
  cedula: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  fechaIngreso: string;
  fechaSalida?: string;
  estado?: 'ACTIVO' | 'INACTIVO' | 'LICENCIA';
  cargoId: string;
  departamentoId: string;
}

export type UpdateEmpleadoDto = Partial<Omit<CreateEmpleadoDto, 'cedula'>>;

export const empleadoApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<ListEmpleadosResp>('/empleados', { params }).then(r => r.data),

  getOne: (id: string) =>
    api.get<Empleado>(`/empleados/${id}`).then(r => r.data),

  create: (data: CreateEmpleadoDto) =>
    api.post<Empleado>('/empleados', data).then(r => r.data),

  update: (id: string, data: UpdateEmpleadoDto) =>
    api.put<Empleado>(`/empleados/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/empleados/${id}`).then(r => r.data),

  getAfiliacion: (id: string) =>
    api.get<Afiliacion>(`/empleados/${id}/afiliacion`).then(r => r.data),

  upsertAfiliacion: (id: string, data: Omit<Afiliacion, 'id' | 'empleadoId' | 'createdAt' | 'updatedAt'>) =>
    api.put<Afiliacion>(`/empleados/${id}/afiliacion`, data).then(r => r.data),
};
