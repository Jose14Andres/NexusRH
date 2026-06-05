import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { verifyJWT } from '../../middleware/auth';
import { loginSchema, changePasswordSchema } from './auth.schemas';
import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
  changePasswordHandler,
} from './auth.controller';

const router = Router();

// POST /api/auth/login            — público
router.post('/login', validate(loginSchema), loginHandler);

// POST /api/auth/refresh          — usa cookie httpOnly, no requiere JWT en header
router.post('/refresh', refreshHandler);

// POST /api/auth/logout           — con o sin JWT válido
router.post('/logout', verifyJWT, logoutHandler);

// GET  /api/auth/me               — requiere JWT
router.get('/me', verifyJWT, meHandler);

// PUT  /api/auth/change-password  — requiere JWT
router.put(
  '/change-password',
  verifyJWT,
  validate(changePasswordSchema),
  changePasswordHandler,
);

export default router;
