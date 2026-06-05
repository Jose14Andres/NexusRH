import { prisma } from '../lib/prisma';

interface AuditoriaParams {
  usuarioId?: string;
  accion: string;       // LOGIN | LOGOUT | CREATE | UPDATE | DELETE | EXPORT
  entidad: string;      // "Empleado" | "Nomina" | "Usuario" | ...
  entidadId?: string;
  detalle?: object;
  ip?: string;
}

export async function logAuditoria(params: AuditoriaParams): Promise<void> {
  try {
    await prisma.logAuditoria.create({
      data: {
        usuarioId: params.usuarioId,
        accion:    params.accion,
        entidad:   params.entidad,
        entidadId: params.entidadId,
        detalle:   params.detalle ? JSON.stringify(params.detalle) : null,
        ip:        params.ip,
      },
    });
  } catch {
    // El fallo de auditoría no debe interrumpir la operación
    console.error('[auditoria] Error al registrar log:', params);
  }
}
