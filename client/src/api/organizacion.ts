import api from './axios';

export interface Organizacion {
  id: string;
  nombre: string;
  tipo: 'PUBLICA' | 'PRIVADA';
  ruc: string;
  direccion: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { departamentos: number };
}

export interface CreateOrganizacionDto {
  nombre: string;
  tipo: 'PUBLICA' | 'PRIVADA';
  ruc: string;
  direccion?: string;
}

export const organizacionApi = {
  list: ()                                    => api.get<Organizacion[]>('/organizaciones').then(r => r.data),
  getById: (id: string)                       => api.get<Organizacion>(`/organizaciones/${id}`).then(r => r.data),
  create: (data: CreateOrganizacionDto)       => api.post<Organizacion>('/organizaciones', data).then(r => r.data),
  update: (id: string, data: Partial<CreateOrganizacionDto>) =>
                                                 api.put<Organizacion>(`/organizaciones/${id}`, data).then(r => r.data),
  remove: (id: string)                        => api.delete(`/organizaciones/${id}`).then(r => r.data),
};
