import { z } from 'zod';

export const createOrganizacionSchema = z.object({
  nombre:    z.string().min(1, 'Nombre requerido').max(100),
  tipo:      z.enum(['PUBLICA', 'PRIVADA'], { errorMap: () => ({ message: 'Tipo inválido' }) }),
  ruc:       z.string()
               .min(10, 'RUC debe tener al menos 10 dígitos')
               .max(13, 'RUC no puede superar 13 dígitos')
               .regex(/^\d+$/, 'RUC debe ser numérico'),
  direccion: z.string().max(200).optional(),
});

export const updateOrganizacionSchema = createOrganizacionSchema.partial();

export type CreateOrganizacion = z.infer<typeof createOrganizacionSchema>;
export type UpdateOrganizacion = z.infer<typeof updateOrganizacionSchema>;
