import { prisma } from '../../lib/prisma';
import { comparePassword, hashPassword } from '../../lib/bcrypt';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  JwtPayload,
} from '../../lib/jwt';
import bcrypt from 'bcryptjs';

// ─── Helper: cargar usuario con roles y permisos ──────────
async function findUserWithRoles(where: { id?: string; username?: string }) {
  return prisma.usuario.findUnique({
    where: where as { id: string } | { username: string },
    include: {
      roles: {
        include: {
          rol: {
            include: {
              permisos: { include: { permiso: true } },
            },
          },
        },
      },
      empleado: {
        select: {
          id: true,
          departamentoId: true,
          nombres: true,
          apellidos: true,
          email: true,
          cargo: { select: { nombre: true } },
          departamento: { select: { nombre: true } },
        },
      },
    },
  });
}

function buildPayload(user: NonNullable<Awaited<ReturnType<typeof findUserWithRoles>>>): JwtPayload {
  const roles = user.roles.map(ur => ur.rol.nombre);
  const permisos = [...new Set(
    user.roles.flatMap(ur => ur.rol.permisos.map(rp => rp.permiso.codigo))
  )];
  return {
    sub: user.id,
    username: user.username,
    roles,
    permisos,
    empleadoId: user.empleadoId,
    departamentoId: user.empleado?.departamentoId,
  };
}

// ─── Login ────────────────────────────────────────────────
export async function login(username: string, password: string) {
  const user = await findUserWithRoles({ username });

  if (!user || !user.activo) {
    throw new Error('Credenciales inválidas');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new Error('Credenciales inválidas');
  }

  const payload = buildPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(user.id);

  // Guardar hash del refresh token
  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await prisma.usuario.update({
    where: { id: user.id },
    data: { refreshToken: refreshHash },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      roles: payload.roles,
      permisos: payload.permisos,
      empleadoId: user.empleadoId,
      departamentoId: user.empleado?.departamentoId,
      empleado: user.empleado
        ? {
            nombres:    user.empleado.nombres,
            apellidos:  user.empleado.apellidos,
            email:      user.empleado.email,
            cargo:      user.empleado.cargo.nombre,
            departamento: user.empleado.departamento.nombre,
          }
        : null,
    },
  };
}

// ─── Refresh ──────────────────────────────────────────────
export async function refresh(refreshToken: string) {
  let decoded: { sub: string };
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error('Refresh token inválido o expirado');
  }

  const user = await findUserWithRoles({ id: decoded.sub });
  if (!user || !user.activo || !user.refreshToken) {
    throw new Error('Sesión no encontrada');
  }

  const valid = await bcrypt.compare(refreshToken, user.refreshToken);
  if (!valid) {
    throw new Error('Refresh token inválido');
  }

  const payload = buildPayload(user);
  return { accessToken: signAccessToken(payload) };
}

// ─── Logout ───────────────────────────────────────────────
export async function logout(userId: string) {
  await prisma.usuario.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}

// ─── Me ───────────────────────────────────────────────────
export async function me(userId: string) {
  const user = await findUserWithRoles({ id: userId });
  if (!user) throw new Error('Usuario no encontrado');

  const payload = buildPayload(user);
  return {
    id: user.id,
    username: user.username,
    roles: payload.roles,
    permisos: payload.permisos,
    empleadoId: user.empleadoId,
    departamentoId: user.empleado?.departamentoId,
    empleado: user.empleado
      ? {
          nombres:     user.empleado.nombres,
          apellidos:   user.empleado.apellidos,
          email:       user.empleado.email,
          cargo:       user.empleado.cargo.nombre,
          departamento: user.empleado.departamento.nombre,
        }
      : null,
  };
}

// ─── Cambiar contraseña ───────────────────────────────────
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!user) throw new Error('Usuario no encontrado');

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw new Error('Contraseña actual incorrecta');

  const newHash = await hashPassword(newPassword);
  await prisma.usuario.update({
    where: { id: userId },
    data: { passwordHash: newHash, refreshToken: null }, // invalida sesiones existentes
  });
}
