import { Request, Response } from 'express';
import * as service from './exportacion.service';
import { buildExport, Formato, ExportDataset } from '../../lib/exporters';
import { sendError } from '../../lib/errors';
import { logAuditoria } from '../../middleware/auditoria';
import {
  ExportEmpleadosQuery,
  ExportHorasQuery,
  ExportNominaQuery,
} from './exportacion.schemas';

function viewer(req: Request): service.ViewerContext {
  return {
    roles:          req.user!.roles,
    sub:            req.user!.sub,
    empleadoId:     req.user!.empleadoId,
    departamentoId: req.user!.departamentoId,
  };
}

/** Convierte el título del reporte en un nombre de archivo seguro. */
function slugFilename(title: string, ext: string): string {
  const fecha = new Date().toISOString().slice(0, 10);
  const base = title
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return `${base || 'reporte'}_${fecha}.${ext}`;
}

/** Genera el archivo, lo envía como descarga y registra la auditoría. */
async function dispatch(
  req: Request,
  res: Response,
  formato: Formato,
  dataset: ExportDataset,
  entidad: string,
): Promise<void> {
  const file = await buildExport(formato, dataset);
  const filename = slugFilename(dataset.title, file.extension);

  await logAuditoria({
    usuarioId: req.user?.sub,
    accion: 'EXPORT',
    entidad,
    detalle: { formato, filtros: req.query, filas: dataset.rows.length },
    ip: req.ip,
  });

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', file.buffer.length);
  res.send(file.buffer);
}

export async function empleados(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as unknown as ExportEmpleadosQuery;
    const dataset = await service.buildEmpleadosDataset(query, viewer(req));
    await dispatch(req, res, query.formato, dataset, 'Empleado');
  } catch (err) { sendError(res, err); }
}

export async function horas(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as unknown as ExportHorasQuery;
    const dataset = await service.buildHorasDataset(query, viewer(req));
    await dispatch(req, res, query.formato, dataset, 'RegistroHoras');
  } catch (err) { sendError(res, err); }
}

export async function nomina(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as unknown as ExportNominaQuery;
    const dataset = await service.buildNominaDataset(query, viewer(req));
    await dispatch(req, res, query.formato, dataset, 'Nomina');
  } catch (err) { sendError(res, err); }
}
