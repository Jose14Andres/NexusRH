import { Router } from 'express';
import { verifyJWT, checkPermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createHorasSchema,
  updateHorasSchema,
  rechazarSchema,
  listHorasQuery,
  resumenQuery,
} from './horas.schemas';
import {
  list,
  pendientes,
  getOne,
  create,
  update,
  remove,
  aprobar,
  rechazar,
  getResumen,
} from './horas.controller';

const router = Router();

router.use(verifyJWT);

// GET  /api/horas                  — lista con filtros (scope por rol en service)
router.get('/',            checkPermission('horas:read'),    validate(listHorasQuery, 'query'), list);

// GET  /api/horas/pendientes       — cola de aprobación
router.get('/pendientes',  checkPermission('horas:approve'), pendientes);

// GET  /api/horas/resumen          — totales APROBADOS por período (para nómina)
router.get('/resumen',     checkPermission('horas:read'),    validate(resumenQuery, 'query'), getResumen);

// GET  /api/horas/:id
router.get('/:id',         checkPermission('horas:read'),    getOne);

// POST /api/horas
router.post('/',           checkPermission('horas:write'),   validate(createHorasSchema), create);

// PUT  /api/horas/:id              — solo PENDIENTE, solo dueño o privilegiados
router.put('/:id',         checkPermission('horas:write'),   validate(updateHorasSchema), update);

// DELETE /api/horas/:id            — solo PENDIENTE, solo dueño o privilegiados
router.delete('/:id',      checkPermission('horas:write'),   remove);

// POST /api/horas/:id/aprobar
router.post('/:id/aprobar',  checkPermission('horas:approve'), aprobar);

// POST /api/horas/:id/rechazar
router.post('/:id/rechazar', checkPermission('horas:approve'), validate(rechazarSchema), rechazar);

export default router;
