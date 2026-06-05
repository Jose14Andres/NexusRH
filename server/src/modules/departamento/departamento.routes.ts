import { Router } from 'express';
import { verifyJWT, checkPermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createDepartamentoSchema, updateDepartamentoSchema, listDepartamentoQuery } from './departamento.schemas';
import { list, getOne, create, update, remove } from './departamento.controller';

const router = Router();

router.use(verifyJWT);

// GET  /api/departamentos?organizacionId=  — departamento:read
router.get('/',    checkPermission('departamento:read'),   validate(listDepartamentoQuery, 'query'), list);

// GET  /api/departamentos/:id             — departamento:read
router.get('/:id', checkPermission('departamento:read'),   getOne);

// POST /api/departamentos                 — departamento:write
router.post('/',   checkPermission('departamento:write'),  validate(createDepartamentoSchema), create);

// PUT  /api/departamentos/:id             — departamento:write
router.put('/:id', checkPermission('departamento:write'),  validate(updateDepartamentoSchema), update);

// DELETE /api/departamentos/:id           — departamento:delete
router.delete('/:id', checkPermission('departamento:delete'), remove);

export default router;
