import { Router } from 'express';
import { verifyJWT, checkPermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createOrganizacionSchema, updateOrganizacionSchema } from './organizacion.schemas';
import { list, getOne, create, update, remove } from './organizacion.controller';

const router = Router();

// Todos los endpoints requieren JWT
router.use(verifyJWT);

// GET  /api/organizaciones          — organizacion:read
router.get('/',    checkPermission('organizacion:read'),  list);

// GET  /api/organizaciones/:id      — organizacion:read
router.get('/:id', checkPermission('organizacion:read'),  getOne);

// POST /api/organizaciones          — organizacion:write
router.post('/',   checkPermission('organizacion:write'), validate(createOrganizacionSchema), create);

// PUT  /api/organizaciones/:id      — organizacion:write
router.put('/:id', checkPermission('organizacion:write'), validate(updateOrganizacionSchema), update);

// DELETE /api/organizaciones/:id   — organizacion:write (solo ADMIN tiene este permiso)
router.delete('/:id', checkPermission('organizacion:write'), remove);

export default router;
