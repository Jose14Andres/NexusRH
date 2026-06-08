import { z } from 'zod';
import { validarCedula } from '../../lib/cedula';

const estadoEmpleado = z.enum(['ACTIVO', 'INACTIVO', 'LICENCIA']);
const tipoSeguro     = z.enum(['IESS', 'PRIVADO', 'NINGUNO']);

export const createEmpleadoSchema = z.object({
  cedula:         z.string().refine(validarCedula, 'Cédula ecuatoriana inválida (10 dígitos, módulo 10)'),
  nombres:        z.string().min(1, 'Nombres requeridos').max(100),
  apellidos:      z.string().min(1, 'Apellidos requeridos').max(100),
  email:          z.string().email('Email inválido'),
  telefono:       z.string().max(20).optional(),
  fechaIngreso:   z.coerce.date(),
  fechaSalida:    z.coerce.date().optional(),
  estado:         estadoEmpleado.default('ACTIVO'),
  cargoId:        z.string().min(1, 'Cargo requerido'),
  departamentoId: z.string().min(1, 'Departamento requerido'),
});

export const updateEmpleadoSchema = createEmpleadoSchema
  .omit({ cedula: true })
  .partial();

export const afiliacionSchema = z.object({
  asegurado:        z.boolean(),
  numeroAfiliacion: z.string().max(20).nullable().optional(),
  tipoSeguro:       tipoSeguro.default('NINGUNO'),
  fechaAfiliacion:  z.coerce.date().nullable().optional(),
});

export const listEmpleadoQuery = z.object({
  departamentoId: z.string().optional(),
  cargoId:        z.string().optional(),
  estado:         estadoEmpleado.optional(),
  q:              z.string().optional(),
  page:           z.coerce.number().int().min(1).default(1),
  limit:          z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateEmpleado    = z.infer<typeof createEmpleadoSchema>;
export type UpdateEmpleado    = z.infer<typeof updateEmpleadoSchema>;
export type AfiliacionInput   = z.infer<typeof afiliacionSchema>;
export type ListEmpleadoQuery = z.infer<typeof listEmpleadoQuery>;
