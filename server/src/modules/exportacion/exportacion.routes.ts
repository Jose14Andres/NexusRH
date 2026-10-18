import { Router } from 'express';
import { verifyJWT, checkPermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  exportEmpleadosQuery,
  exportHorasQuery,
  exportNominaQuery,
} from './exportacion.schemas';
import { empleados, horas, nomina } from './exportacion.controller';

const router = Router();

router.use(verifyJWT);

// GET /api/exportacion/empleados?formato=csv|xlsx|pdf
router.get('/empleados', checkPermission('empleado:export'),     validate(exportEmpleadosQuery, 'query'), empleados);

// GET /api/exportacion/horas?formato=...&estado=...&desde=...&hasta=...
router.get('/horas',     checkPermission('horas:export'),        validate(exportHorasQuery, 'query'),     horas);

// GET /api/exportacion/nomina?formato=...&mes=...&anio=...&estado=...
router.get('/nomina',    checkPermission('nomina:export'),       validate(exportNominaQuery, 'query'),    nomina);

export default router;
