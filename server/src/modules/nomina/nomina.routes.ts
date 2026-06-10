import { Router } from 'express';
import { verifyJWT, checkPermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  calcularNominaSchema,
  updateNominaSchema,
  pagarNominaSchema,
  listNominaQuery,
} from './nomina.schemas';
import {
  list,
  getOne,
  calcular,
  update,
  aprobar,
  pagar,
  remove,
} from './nomina.controller';

const router = Router();

router.use(verifyJWT);

// GET  /api/nomina              — lista con filtros
router.get('/',               checkPermission('nomina:read'),    validate(listNominaQuery, 'query'), list);

// GET  /api/nomina/:id          — detalle
router.get('/:id',            checkPermission('nomina:read'),    getOne);

// POST /api/nomina/calcular     — generar nóminas del período
router.post('/calcular',      checkPermission('nomina:write'),   validate(calcularNominaSchema), calcular);

// PUT  /api/nomina/:id          — ajustar descuentos/bonos
router.put('/:id',            checkPermission('nomina:write'),   validate(updateNominaSchema), update);

// POST /api/nomina/:id/aprobar  — CALCULADO → APROBADO
router.post('/:id/aprobar',   checkPermission('nomina:approve'), aprobar);

// POST /api/nomina/:id/pagar    — APROBADO → PAGADO
router.post('/:id/pagar',     checkPermission('nomina:approve'), validate(pagarNominaSchema), pagar);

// DELETE /api/nomina/:id        — solo CALCULADO
router.delete('/:id',         checkPermission('nomina:write'),   remove);

export default router;
