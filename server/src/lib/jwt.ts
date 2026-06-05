import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  username: string;
  roles: string[];
  permisos: string[];
  empleadoId?: string | null;
  departamentoId?: string | null;
}

export function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Variable de entorno requerida: ${key}`);
  return val;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload as any, requireEnv('JWT_SECRET'), {
  return jwt.sign(payload, requireEnv('JWT_SECRET'), {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, requireEnv('JWT_REFRESH_SECRET'), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, requireEnv('JWT_SECRET')) as JwtPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, requireEnv('JWT_REFRESH_SECRET')) as { sub: string };
}
