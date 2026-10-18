import { z } from 'zod';

const formato = z.enum(['csv', 'xlsx', 'pdf']).default('xlsx');

export const exportEmpleadosQuery = z.object({
  formato,
  estado:         z.enum(['ACTIVO', 'INACTIVO', 'LICENCIA']).optional(),
  departamentoId: z.string().optional(),
  cargoId:        z.string().optional(),
});

export const exportHorasQuery = z.object({
  formato,
  estado:     z.enum(['PENDIENTE', 'APROBADO', 'RECHAZADO']).optional(),
  empleadoId: z.string().optional(),
  desde:      z.coerce.date().optional(),
  hasta:      z.coerce.date().optional(),
});

export const exportNominaQuery = z.object({
  formato,
  mes:        z.coerce.number().int().min(1).max(12).optional(),
  anio:       z.coerce.number().int().min(2020).max(2100).optional(),
  estado:     z.enum(['PENDIENTE', 'CALCULADO', 'APROBADO', 'PAGADO']).optional(),
  empleadoId: z.string().optional(),
});

export type ExportEmpleadosQuery = z.infer<typeof exportEmpleadosQuery>;
export type ExportHorasQuery     = z.infer<typeof exportHorasQuery>;
export type ExportNominaQuery    = z.infer<typeof exportNominaQuery>;
