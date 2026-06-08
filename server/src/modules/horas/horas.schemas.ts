import { z } from 'zod';

const today = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export const createHorasSchema = z.object({
  empleadoId:    z.string().min(1, 'empleadoId requerido'),
  fecha:         z.coerce.date().refine(d => d <= today(), 'La fecha no puede ser futura'),
  horasNormales: z.number().min(0, 'Horas no negativas').max(24),
  horasExtras:   z.number().min(0, 'Horas no negativas').max(24),
  observacion:   z.string().max(500).optional(),
}).refine(
  d => d.horasNormales + d.horasExtras <= 24,
  { message: 'La suma de horas normales y extras no puede superar 24 h', path: ['horasExtras'] },
);

export const updateHorasSchema = z.object({
  horasNormales: z.number().min(0).max(24).optional(),
  horasExtras:   z.number().min(0).max(24).optional(),
  observacion:   z.string().max(500).optional(),
}).refine(
  d => (d.horasNormales ?? 0) + (d.horasExtras ?? 0) <= 24,
  { message: 'La suma de horas normales y extras no puede superar 24 h', path: ['horasExtras'] },
);

export const rechazarSchema = z.object({
  motivoRechazo: z.string().min(1, 'El motivo de rechazo es requerido').max(500),
});

export const listHorasQuery = z.object({
  empleadoId:     z.string().optional(),
  departamentoId: z.string().optional(),
  estado:         z.enum(['PENDIENTE', 'APROBADO', 'RECHAZADO']).optional(),
  mes:            z.coerce.number().int().min(1).max(12).optional(),
  anio:           z.coerce.number().int().min(2000).max(2100).optional(),
  page:           z.coerce.number().int().min(1).default(1),
  limit:          z.coerce.number().int().min(1).max(100).default(20),
});

export const resumenQuery = z.object({
  empleadoId: z.string().optional(),
  mes:        z.coerce.number().int().min(1).max(12),
  anio:       z.coerce.number().int().min(2000).max(2100),
});

export type CreateHoras    = z.infer<typeof createHorasSchema>;
export type UpdateHoras    = z.infer<typeof updateHorasSchema>;
export type RechazarInput  = z.infer<typeof rechazarSchema>;
export type ListHorasQuery = z.infer<typeof listHorasQuery>;
export type ResumenQuery   = z.infer<typeof resumenQuery>;
