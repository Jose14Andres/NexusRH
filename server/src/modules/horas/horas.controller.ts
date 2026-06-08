import { Request, Response } from 'express';
import * as service from './horas.service';
import { sendError } from '../../lib/errors';
import { logAuditoria } from '../../middleware/auditoria';
import { ListHorasQuery, ResumenQuery } from './horas.schemas';

function viewer(req: Request): service.ViewerContext {
  return {
    roles:          req.user!.roles,
    sub:            req.user!.sub,
    empleadoId:     req.user!.empleadoId,
    departamentoId: req.user!.departamentoId,
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.findAll(req.query as unknown as ListHorasQuery, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function pendientes(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.findPendientes(viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.findById(req.params.id, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.create(req.body, viewer(req));
    res.status(201).json(data);
  } catch (err) { sendError(res, err); }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.update(req.params.id, req.body, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await service.remove(req.params.id, viewer(req));
    res.json({ message: 'Registro eliminado' });
  } catch (err) { sendError(res, err); }
}

export async function aprobar(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.aprobar(req.params.id, viewer(req));
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'UPDATE', entidad: 'RegistroHoras', entidadId: req.params.id,
      detalle: { accion: 'APROBADO' },
      ip: req.ip,
    });
    res.json(data);
  } catch (err) { sendError(res, err); }
}

export async function rechazar(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.rechazar(req.params.id, req.body, viewer(req));
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'UPDATE', entidad: 'RegistroHoras', entidadId: req.params.id,
      detalle: { accion: 'RECHAZADO', motivo: req.body.motivoRechazo },
      ip: req.ip,
    });
    res.json(data);
  } catch (err) { sendError(res, err); }
}

export async function getResumen(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.resumen(req.query as unknown as ResumenQuery, viewer(req)));
  } catch (err) { sendError(res, err); }
}
