import { Router } from 'express';
import { verifyJWT, checkPermission, checkSelf } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createEmpleadoSchema,
  updateEmpleadoSchema,
  afiliacionSchema,
  listEmpleadoQuery,
} from './empleado.schemas';
import {
  list,
  getOne,
  create,
  update,
  remove,
  getAfiliacion,
  upsertAfiliacion,
} from './empleado.controller';

const router = Router();

router.use(verifyJWT);

// GET  /api/empleados                      — empleado:read (scope por rol en service)
router.get('/',    checkPermission('empleado:read'),  validate(listEmpleadoQuery, 'query'), list);

// GET  /api/empleados/:id                  — empleado:read (scope en service)
router.get('/:id', checkPermission('empleado:read'),  getOne);

// POST /api/empleados                      — empleado:write
router.post('/',   checkPermission('empleado:write'), validate(createEmpleadoSchema), create);

// PUT  /api/empleados/:id                  — empleado:write
router.put('/:id', checkPermission('empleado:write'), validate(updateEmpleadoSchema), update);

// DELETE /api/empleados/:id  (soft delete) — empleado:delete
router.delete('/:id', checkPermission('empleado:delete'), remove);

// GET  /api/empleados/:id/afiliacion       — afiliacion:read + checkSelf
router.get(
  '/:id/afiliacion',
  checkPermission('afiliacion:read'),
  checkSelf(req => req.params.id),
  getAfiliacion,
);

// PUT  /api/empleados/:id/afiliacion       — afiliacion:write (solo RRHH/ADMIN)
router.put(
  '/:id/afiliacion',
  checkPermission('afiliacion:write'),
  validate(afiliacionSchema),
  upsertAfiliacion,
);

export default router;
