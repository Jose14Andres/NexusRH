import api from './axios';

export interface Departamento {
  id: string;
  nombre: string;
  organizacionId: string;
  organizacion: { id: string; nombre: string };
  createdAt: string;
  updatedAt: string;
  _count: { cargos: number; empleados: number };
}

export interface CreateDepartamentoDto {
  nombre: string;
  organizacionId: string;
}

export const departamentoApi = {
  list: (organizacionId?: string) =>
    api.get<Departamento[]>('/departamentos', {
      params: organizacionId ? { organizacionId } : {},
    }).then(r => r.data),

  getById: (id: string) =>
    api.get<Departamento>(`/departamentos/${id}`).then(r => r.data),

  create: (data: CreateDepartamentoDto) =>
    api.post<Departamento>('/departamentos', data).then(r => r.data),

  update: (id: string, data: Partial<CreateDepartamentoDto>) =>
    api.put<Departamento>(`/departamentos/${id}`, data).then(r => r.data),

  remove: (id: string) =>
    api.delete(`/departamentos/${id}`).then(r => r.data),
};
