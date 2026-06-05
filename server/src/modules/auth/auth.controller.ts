import { Request, Response } from 'express';
import * as authService from './auth.service';
import { logAuditoria } from '../../middleware/auditoria';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
};

export async function loginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);

    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    await logAuditoria({
      usuarioId: result.user.id,
      accion: 'LOGIN',
      entidad: 'Usuario',
      entidadId: result.user.id,
      ip: req.ip,
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de autenticación';
    res.status(401).json({ error: msg });
  }
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      res.status(401).json({ error: 'Refresh token no encontrado' });
      return;
    }
    const result = await authService.refresh(token);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al refrescar sesión';
    res.clearCookie(REFRESH_COOKIE);
    res.status(401).json({ error: msg });
  }
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  try {
    if (req.user) {
      await authService.logout(req.user.sub);
      await logAuditoria({
        usuarioId: req.user.sub,
        accion: 'LOGOUT',
        entidad: 'Usuario',
        entidadId: req.user.sub,
        ip: req.ip,
      });
    }
    res.clearCookie(REFRESH_COOKIE);
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch {
    res.clearCookie(REFRESH_COOKIE);
    res.json({ message: 'Sesión cerrada' });
  }
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  try {
    const data = await authService.me(req.user!.sub);
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    res.status(404).json({ error: msg });
  }
}

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.sub, currentPassword, newPassword);

    await logAuditoria({
      usuarioId: req.user!.sub,
      accion: 'UPDATE',
      entidad: 'Usuario',
      entidadId: req.user!.sub,
      detalle: { accion: 'cambio_contraseña' },
      ip: req.ip,
    });

    res.clearCookie(REFRESH_COOKIE); // fuerza re-login
    res.json({ message: 'Contraseña actualizada. Por favor inicie sesión nuevamente.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    res.status(400).json({ error: msg });
  }
}
