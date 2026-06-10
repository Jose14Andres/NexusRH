import { Request, Response } from 'express';
import * as service from './nomina.service';
import { sendError } from '../../lib/errors';
import { logAuditoria } from '../../middleware/auditoria';
import { ListNominaQuery, PagarNomina } from './nomina.schemas';

function viewer(req: Request): service.ViewerContext {
  return {
    roles:      req.user!.roles,
    sub:        req.user!.sub,
    empleadoId: req.user!.empleadoId,
  };
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.findAll(req.query as unknown as ListNominaQuery, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.findById(req.params.id, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function calcular(req: Request, res: Response): Promise<void> {
  try {
    const result = await service.calcular(req.body, viewer(req));
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'CREATE', entidad: 'Nomina',
      detalle: { mes: req.body.mes, anio: req.body.anio, calculadas: result.calculadas },
      ip: req.ip,
    });
    res.status(201).json(result);
  } catch (err) { sendError(res, err); }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.update(req.params.id, req.body, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function aprobar(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.aprobar(req.params.id, viewer(req));
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'UPDATE', entidad: 'Nomina', entidadId: req.params.id,
      detalle: { accion: 'APROBADO' },
      ip: req.ip,
    });
    res.json(data);
  } catch (err) { sendError(res, err); }
}

export async function pagar(req: Request, res: Response): Promise<void> {
  try {
    const data = await service.pagar(req.params.id, req.body as PagarNomina, viewer(req));
    await logAuditoria({
      usuarioId: req.user?.sub,
      accion: 'UPDATE', entidad: 'Nomina', entidadId: req.params.id,
      detalle: { accion: 'PAGADO', fechaPago: req.body.fechaPago },
      ip: req.ip,
    });
    res.json(data);
  } catch (err) { sendError(res, err); }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await service.remove(req.params.id, viewer(req));
    res.json({ message: 'Nómina eliminada' });
  } catch (err) { sendError(res, err); }
}
