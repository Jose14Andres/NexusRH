import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FolderOpen,
  Briefcase,
  Users,
  Clock,
  DollarSign,
  BarChart2,
  FileDown,
  UserCog,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      to: '/dashboard',      icon: LayoutDashboard                       },
  { label: 'Organización',   to: '/organizacion',   icon: Building2,    permission: 'organizacion:read'  },
  { label: 'Departamentos',  to: '/departamentos',  icon: FolderOpen,   permission: 'departamento:read'  },
  { label: 'Cargos',         to: '/cargos',         icon: Briefcase,    permission: 'cargo:read'         },
  { label: 'Empleados',      to: '/empleados',      icon: Users,        permission: 'empleado:read'      },
  { label: 'Mis Horas',      to: '/horas',          icon: Clock,        permission: 'horas:read'         },
  { label: 'Aprobación',    to: '/horas/aprobacion',icon: Clock,        permission: 'horas:approve'      },
  { label: 'Nómina',         to: '/nomina',         icon: DollarSign,   permission: 'nomina:read'        },
  { label: 'Estadísticas',   to: '/estadisticas',   icon: BarChart2,    permission: 'estadisticas:read'  },
  { label: 'Exportación',    to: '/exportacion',    icon: FileDown,     permission: 'estadisticas:export'},
  { label: 'Usuarios',       to: '/usuarios',       icon: UserCog,      permission: 'usuario:read'       },
  { label: 'Auditoría',      to: '/auditoria',      icon: ClipboardList,permission: 'auditoria:read'     },
  { label: 'Configuración',  to: '/configuracion',  icon: Settings,     permission: 'config:manage'      },
];

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  ADMIN:        { label: 'Admin',        color: 'bg-red-100 text-red-700'     },
  RRHH:         { label: 'RRHH',         color: 'bg-blue-100 text-blue-700'   },
  CONTABILIDAD: { label: 'Contabilidad', color: 'bg-green-100 text-green-700' },
  SUPERVISOR:   { label: 'Supervisor',   color: 'bg-yellow-100 text-yellow-700'},
  EMPLEADO:     { label: 'Empleado',     color: 'bg-gray-100 text-gray-700'   },
};

export default function DashboardLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    item => !item.permission || hasPermission(item.permission),
  );

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const primaryRole = user?.roles[0] ?? 'EMPLEADO';
  const badge = ROLE_BADGE[primaryRole] ?? ROLE_BADGE['EMPLEADO'];
  const displayName = user?.empleado
    ? `${user.empleado.nombres} ${user.empleado.apellidos}`
    : user?.username ?? '';

  const Sidebar = () => (
    <aside className="flex h-full w-64 flex-col bg-gray-900 text-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-700 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">NexusRH</span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {visibleItems.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Usuario */}
      <div className="border-t border-gray-700 p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold uppercase">
            {displayName.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <span className={`badge text-xs ${badge.color}`}>{badge.label}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Sidebar mobile (overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar móvil */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Abrir menú"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-semibold text-gray-800">NexusRH</span>
        </header>

        {/* Página */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
