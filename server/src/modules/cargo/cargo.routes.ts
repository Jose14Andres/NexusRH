import { Router } from 'express';
import { verifyJWT, checkPermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCargoSchema, updateCargoSchema, listCargoQuery } from './cargo.schemas';
import { list, getOne, create, update, remove } from './cargo.controller';

const router = Router();

router.use(verifyJWT);

// GET  /api/cargos?departamentoId=   — cargo:read
router.get('/',    checkPermission('cargo:read'),    validate(listCargoQuery, 'query'), list);

// GET  /api/cargos/:id               — cargo:read
router.get('/:id', checkPermission('cargo:read'),    getOne);

// POST /api/cargos                   — cargo:write
router.post('/',   checkPermission('cargo:write'),   validate(createCargoSchema), create);

// PUT  /api/cargos/:id               — cargo:write
router.put('/:id', checkPermission('cargo:write'),   validate(updateCargoSchema), update);

// DELETE /api/cargos/:id             — cargo:delete
router.delete('/:id', checkPermission('cargo:delete'), remove);

export default router;
