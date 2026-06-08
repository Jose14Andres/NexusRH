import { Request, Response } from 'express';
import * as service from './empleado.service';
import { sendError } from '../../lib/errors';
import { logAuditoria } from '../../middleware/auditoria';
import { ListEmpleadoQuery } from './empleado.schemas';

function viewer(req: Request): service.ViewerContext {
  return {
    roles:          req.user!.roles,
    empleadoId:     req.user!.empleadoId,
    departamentoId: req.user!.departamentoId,
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.findAll(req.query as unknown as ListEmpleadoQuery, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.findById(req.params.id, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.create(req.body);
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'CREATE', entidad: 'Empleado', entidadId: data?.id,
      detalle: { cedula: req.body.cedula, nombres: req.body.nombres, apellidos: req.body.apellidos },
      ip: req.ip,
    });
    res.status(201).json(data);
  } catch (err) { sendError(res, err); }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.update(req.params.id, req.body);
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'UPDATE', entidad: 'Empleado', entidadId: req.params.id,
      detalle: req.body,
      ip: req.ip,
    });
    res.json(data);
  } catch (err) { sendError(res, err); }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await service.remove(req.params.id);
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'DELETE', entidad: 'Empleado', entidadId: req.params.id,
      ip: req.ip,
    });
    res.json({ message: 'Empleado desactivado correctamente' });
  } catch (err) { sendError(res, err); }
}

export async function getAfiliacion(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.getAfiliacion(req.params.id));
  } catch (err) { sendError(res, err); }
}

export async function upsertAfiliacion(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.upsertAfiliacion(req.params.id, req.body);
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'UPDATE', entidad: 'Afiliacion', entidadId: req.params.id,
      detalle: req.body,
      ip: req.ip,
    });
    res.json(data);
  } catch (err) { sendError(res, err); }
}
