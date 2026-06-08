import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import authRoutes        from './modules/auth/auth.routes';
import organizacionRoutes from './modules/organizacion/organizacion.routes';
import departamentoRoutes from './modules/departamento/departamento.routes';
import cargoRoutes        from './modules/cargo/cargo.routes';
import empleadoRoutes     from './modules/empleado/empleado.routes';

const app = express();

// ─── Seguridad y utilidades ───────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true, // permite enviar cookies
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Rutas ────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/organizaciones', organizacionRoutes);
app.use('/api/departamentos',  departamentoRoutes);
app.use('/api/cargos',         cargoRoutes);
app.use('/api/empleados',      empleadoRoutes);

// Módulos pendientes (se descomentarán módulo a módulo):
// app.use('/api/horas',        horasRoutes);
// app.use('/api/nomina',       nominaRoutes);
// app.use('/api/estadisticas', estadisticasRoutes);
// app.use('/api/exportacion',  exportacionRoutes);
// app.use('/api/usuarios',     usuariosRoutes);
// app.use('/api/auditoria',    auditoriaRoutes);

// ─── Health check ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// ─── Error handler global ─────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
