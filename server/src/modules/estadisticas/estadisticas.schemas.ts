import { z } from 'zod';

const thisYear = new Date().getFullYear();

export const historialSalarialQuery = z.object({
  empleadoId: z.string().optional(),
  ultimos:    z.coerce.number().int().min(1).max(24).default(12),
});

export const horasQuery = z.object({
  empleadoId: z.string().optional(),
  anio:       z.coerce.number().int().min(2020).max(2100).default(thisYear),
});

export const aportacionesQuery = z.object({
  empleadoId: z.string().optional(),
  anio:       z.coerce.number().int().min(2020).max(2100).default(thisYear),
});

export const costoDepartamentoQuery = z.object({
  mes:            z.coerce.number().int().min(1).max(12),
  anio:           z.coerce.number().int().min(2020).max(2100),
  departamentoId: z.string().optional(),
});

export const evolucionNominaQuery = z.object({
  anio:           z.coerce.number().int().min(2020).max(2100).default(thisYear),
  departamentoId: z.string().optional(),
});

export type HistorialSalarialQuery  = z.infer<typeof historialSalarialQuery>;
export type HorasQuery              = z.infer<typeof horasQuery>;
export type AportacionesQuery       = z.infer<typeof aportacionesQuery>;
export type CostoDepartamentoQuery  = z.infer<typeof costoDepartamentoQuery>;
export type EvolucionNominaQuery    = z.infer<typeof evolucionNominaQuery>;
