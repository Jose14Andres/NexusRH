import { Request, Response } from 'express';
import * as service from './estadisticas.service';
import { sendError } from '../../lib/errors';
import {
  HistorialSalarialQuery,
  HorasQuery,
  AportacionesQuery,
  CostoDepartamentoQuery,
  EvolucionNominaQuery,
} from './estadisticas.schemas';

function viewer(req: Request): service.ViewerContext {
  return {
    roles:          req.user!.roles,
    sub:            req.user!.sub,
    empleadoId:     req.user!.empleadoId,
    departamentoId: req.user!.departamentoId,
  };
}

export async function dashboard(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.getDashboard(viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function getHistorialSalarial(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.historialSalarial(req.query as unknown as HistorialSalarialQuery, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function getHoras(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.horasPorMes(req.query as unknown as HorasQuery, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function getAportaciones(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.aportaciones(req.query as unknown as AportacionesQuery, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function getCostoDepartamento(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.costoDepartamento(req.query as unknown as CostoDepartamentoQuery, viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function getAfiliacion(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.afiliacion(viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function getDistribucionCargos(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.distribucionCargos(viewer(req)));
  } catch (err) { sendError(res, err); }
}

export async function getEvolucionNomina(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service.evolucionNomina(req.query as unknown as EvolucionNominaQuery, viewer(req)));
  } catch (err) { sendError(res, err); }
}
