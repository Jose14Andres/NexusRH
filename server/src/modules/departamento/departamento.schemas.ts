import { z } from 'zod';

export const createDepartamentoSchema = z.object({
  nombre:         z.string().min(1, 'Nombre requerido').max(100),
  organizacionId: z.string().min(1, 'Organización requerida'),
});

export const updateDepartamentoSchema = createDepartamentoSchema.partial();

export const listDepartamentoQuery = z.object({
  organizacionId: z.string().optional(),
});

export type CreateDepartamento = z.infer<typeof createDepartamentoSchema>;
export type UpdateDepartamento = z.infer<typeof updateDepartamentoSchema>;
