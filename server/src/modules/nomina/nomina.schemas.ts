import { z } from 'zod';

export const calcularNominaSchema = z.object({
  mes:  z.number().int().min(1).max(12),
  anio: z.number().int().min(2020).max(2100),
});

export const updateNominaSchema = z.object({
  descuentos:    z.number().min(0).optional(),
  bonos:         z.number().min(0).optional(),
  observaciones: z.string().max(1000).optional(),
});

export const pagarNominaSchema = z.object({
  fechaPago: z.coerce.date(),
});

export const listNominaQuery = z.object({
  mes:        z.coerce.number().int().min(1).max(12).optional(),
  anio:       z.coerce.number().int().min(2020).max(2100).optional(),
  estado:     z.enum(['PENDIENTE', 'CALCULADO', 'APROBADO', 'PAGADO']).optional(),
  empleadoId: z.string().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
});

export type CalcularNominaInput = z.infer<typeof calcularNominaSchema>;
export type UpdateNomina        = z.infer<typeof updateNominaSchema>;
export type PagarNomina         = z.infer<typeof pagarNominaSchema>;
export type ListNominaQuery     = z.infer<typeof listNominaQuery>;
