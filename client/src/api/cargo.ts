import api from './axios';

export interface Cargo {
  id: string;
  nombre: string;
  descripcion: string | null;
  departamentoId: string;
  sueldoBase: number;
  jornadaHoras: number;
  departamento: {
    id: string;
    nombre: string;
    organizacion: { id: string; nombre: string };
  };
  createdAt: string;
  updatedAt: string;
  _count: { empleados: number };
}

export interface CreateCargoDto {
  nombre: string;
  descripcion?: string;
  departamentoId: string;
  sueldoBase: number;
  jornadaHoras?: number;
}

export const cargoApi = {
  list: (departamentoId?: string) =>
    api.get<Cargo[]>('/cargos', {
      params: departamentoId ? { departamentoId } : {},
    }).then(r => r.data),

  getById: (id: string) =>
    api.get<Cargo>(`/cargos/${id}`).then(r => r.data),

  create: (data: CreateCargoDto) =>
    api.post<Cargo>('/cargos', data).then(r => r.data),

  update: (id: string, data: Partial<CreateCargoDto>) =>
    api.put<Cargo>(`/cargos/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/cargos/${id}`).then(r => r.data),
};
