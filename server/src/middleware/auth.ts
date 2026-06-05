import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../lib/jwt';

// Ampliar la interfaz Request de Express
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function verifyJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Middleware de permiso: checkPermission('empleado:write')
export function checkPermission(codigo: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    if (!req.user.permisos.includes(codigo)) {
      res.status(403).json({ error: `Permiso insuficiente. Se requiere: ${codigo}` });
      return;
    }
    next();
  };
}

// Scope: solo el propio empleado (EMPLEADO) o roles privilegiados
export function checkSelf(getEmpleadoId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const bypass = ['ADMIN', 'RRHH', 'CONTABILIDAD'];
    if (req.user.roles.some(r => bypass.includes(r))) {
      next();
      return;
    }
    if (req.user.empleadoId !== getEmpleadoId(req)) {
      res.status(403).json({ error: 'Solo puedes acceder a tus propios datos' });
      return;
    }
    next();
  };
}

// Scope: solo recursos del mismo departamento (SUPERVISOR)
export function checkDepartamento(getDeptId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const bypass = ['ADMIN', 'RRHH', 'CONTABILIDAD'];
    if (req.user.roles.some(r => bypass.includes(r))) {
      next();
      return;
    }
    if (req.user.departamentoId !== getDeptId(req)) {
      res.status(403).json({ error: 'Solo puedes acceder a datos de tu departamento' });
      return;
    }
    next();
  };
}
