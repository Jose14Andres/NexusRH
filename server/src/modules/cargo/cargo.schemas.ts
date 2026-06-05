import { z } from 'zod';

export const createCargoSchema = z.object({
  nombre:         z.string().min(1, 'Nombre requerido').max(100),
  descripcion:    z.string().max(500).optional(),
  departamentoId: z.string().min(1, 'Departamento requerido'),
  sueldoBase:     z.number({ invalid_type_error: 'Sueldo debe ser un número' })
                   .positive('Sueldo debe ser positivo')
                   .max(999999.99),
  jornadaHoras:   z.number().int().min(1).max(24).default(8),
});

export const updateCargoSchema = createCargoSchema.partial();

export const listCargoQuery = z.object({
  departamentoId: z.string().optional(),
});

export type CreateCargo = z.infer<typeof createCargoSchema>;
export type UpdateCargo = z.infer<typeof updateCargoSchema>;
