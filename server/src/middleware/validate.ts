import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

type Target = 'body' | 'query' | 'params';

export function validate<T>(schema: ZodSchema<T>, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      res.status(400).json({
        error: 'Datos de entrada inválidos',
        detalles: result.error.flatten().fieldErrors,
      });
      return;
    }
    // Reemplazar con datos validados/parseados (coerce, default, etc.)
    (req as Record<string, unknown>)[target] = result.data;
    next();
  };
}

// Helpers de tipos comunes reutilizables
export const zId = z.string().cuid({ message: 'ID inválido' });
export const zPaginacion = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
