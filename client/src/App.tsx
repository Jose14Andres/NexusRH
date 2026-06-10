import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './features/auth/LoginPage';
import Dashboard from './pages/Dashboard';
import OrganizacionPage from './pages/OrganizacionPage';
import DepartamentosPage from './pages/DepartamentosPage';
import CargosPage from './pages/CargosPage';
import EmpleadosPage from './pages/EmpleadosPage';
import EmpleadoDetailPage from './pages/EmpleadoDetailPage';
import HorasPage from './pages/HorasPage';
import HorasAprobacionPage from './pages/HorasAprobacionPage';
import NominaPage from './pages/NominaPage';
import NominaDetailPage from './pages/NominaDetailPage';

// Placeholder para módulos futuros
function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 text-5xl">🚧</div>
      <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
      <p className="mt-2 text-sm text-gray-400">Módulo en desarrollo</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Público */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protegido — requiere autenticación */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Módulo 2 — Org/Dept/Cargos */}
            <Route path="organizacion"  element={<ProtectedRoute permission="organizacion:read" />}>
              <Route index element={<OrganizacionPage />} />
            </Route>
            <Route path="departamentos" element={<ProtectedRoute permission="departamento:read" />}>
              <Route index element={<DepartamentosPage />} />
            </Route>
            <Route path="cargos"        element={<ProtectedRoute permission="cargo:read" />}>
              <Route index element={<CargosPage />} />
            </Route>

            {/* Módulo 3 — Empleados */}
            <Route
              path="empleados"
              element={<ProtectedRoute permission="empleado:read" />}
            >
              <Route index element={<EmpleadosPage />} />
              <Route path=":id" element={<EmpleadoDetailPage />} />
            </Route>

            {/* Módulo 4 — Horas */}
            <Route
              path="horas"
              element={<ProtectedRoute permission="horas:read" />}
            >
              <Route index element={<HorasPage />} />
              <Route path="aprobacion" element={<ProtectedRoute permission="horas:approve" />}>
                <Route index element={<HorasAprobacionPage />} />
              </Route>
            </Route>

            {/* Módulo 5 — Nómina */}
            <Route
              path="nomina"
              element={<ProtectedRoute permission="nomina:read" />}
            >
              <Route index element={<NominaPage />} />
              <Route path=":id" element={<NominaDetailPage />} />
            </Route>

            {/* Módulo 6 — Estadísticas */}
            <Route
              path="estadisticas"
              element={<ProtectedRoute permission="estadisticas:read" />}
            >
              <Route index element={<Placeholder title="Estadísticas" />} />
            </Route>

            {/* Módulo 7 — Exportación */}
            <Route
              path="exportacion"
              element={<ProtectedRoute permission="estadisticas:export" />}
            >
              <Route index element={<Placeholder title="Exportación de Reportes" />} />
            </Route>

            {/* Módulo 8 — Admin */}
            <Route
              path="usuarios"
              element={<ProtectedRoute permission="usuario:read" />}
            >
              <Route index element={<Placeholder title="Gestión de Usuarios" />} />
            </Route>
            <Route
              path="auditoria"
              element={<ProtectedRoute permission="auditoria:read" />}
            >
              <Route index element={<Placeholder title="Log de Auditoría" />} />
            </Route>
            <Route
              path="configuracion"
              element={<ProtectedRoute permission="config:manage" />}
            >
              <Route index element={<Placeholder title="Configuración del Sistema" />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
