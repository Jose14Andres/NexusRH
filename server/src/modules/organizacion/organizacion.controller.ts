import { Request, Response } from 'express';
import * as service from './organizacion.service';
import { sendError } from '../../lib/errors';
import { logAuditoria } from '../../middleware/auditoria';

export async function list(_req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.findAll());
  } catch (err) { sendError(res, err); }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.findById(req.params.id));
  } catch (err) { sendError(res, err); }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.create(req.body);
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'CREATE', entidad: 'Organizacion', entidadId: data?.id,
      detalle: req.body, ip: req.ip,
    });
    res.status(201).json(data);
  } catch (err) { sendError(res, err); }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.update(req.params.id, req.body);
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'UPDATE', entidad: 'Organizacion', entidadId: req.params.id,
      detalle: req.body, ip: req.ip,
    });
    res.json(data);
  } catch (err) { sendError(res, err); }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await service.remove(req.params.id);
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'DELETE', entidad: 'Organizacion', entidadId: req.params.id,
      ip: req.ip,
    });
    res.json({ message: 'Organización eliminada correctamente' });
  } catch (err) { sendError(res, err); }
}
