import { Router } from 'express';
import { verifyJWT, checkPermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  historialSalarialQuery,
  horasQuery,
  aportacionesQuery,
  costoDepartamentoQuery,
  evolucionNominaQuery,
} from './estadisticas.schemas';
import {
  dashboard,
  getHistorialSalarial,
  getHoras,
  getAportaciones,
  getCostoDepartamento,
  getAfiliacion,
  getDistribucionCargos,
  getEvolucionNomina,
} from './estadisticas.controller';

const router = Router();

router.use(verifyJWT);

// GET /api/estadisticas/dashboard
router.get('/dashboard',
  checkPermission('estadisticas:read:self'),
  dashboard,
);

// GET /api/estadisticas/individual/historial-salarial
router.get('/individual/historial-salarial',
  checkPermission('estadisticas:read:self'),
  validate(historialSalarialQuery, 'query'),
  getHistorialSalarial,
);

// GET /api/estadisticas/individual/horas
router.get('/individual/horas',
  checkPermission('estadisticas:read:self'),
  validate(horasQuery, 'query'),
  getHoras,
);

// GET /api/estadisticas/individual/aportaciones
router.get('/individual/aportaciones',
  checkPermission('estadisticas:read:self'),
  validate(aportacionesQuery, 'query'),
  getAportaciones,
);

// GET /api/estadisticas/organizacion/costo-departamento
router.get('/organizacion/costo-departamento',
  checkPermission('estadisticas:read:dept'),
  validate(costoDepartamentoQuery, 'query'),
  getCostoDepartamento,
);

// GET /api/estadisticas/organizacion/afiliacion
router.get('/organizacion/afiliacion',
  checkPermission('estadisticas:read:org'),
  getAfiliacion,
);

// GET /api/estadisticas/organizacion/distribucion-cargos
router.get('/organizacion/distribucion-cargos',
  checkPermission('estadisticas:read:org'),
  getDistribucionCargos,
);

// GET /api/estadisticas/organizacion/evolucion-nomina
router.get('/organizacion/evolucion-nomina',
  checkPermission('estadisticas:read:dept'),
  validate(evolucionNominaQuery, 'query'),
  getEvolucionNomina,
);

export default router;
