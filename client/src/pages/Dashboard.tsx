import { useAuth } from '../features/auth/AuthContext';
import {
  Users, DollarSign, Clock, Building2,
  TrendingUp, CheckCircle, AlertCircle, FileText,
} from 'lucide-react';

interface KpiCard {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

// KPIs por rol — se poblarán con datos reales en el módulo de estadísticas
const KPI_BY_ROLE: Record<string, KpiCard[]> = {
  ADMIN: [
    { label: 'Total Empleados',    value: '—', icon: Users,       color: 'text-blue-600',   bgColor: 'bg-blue-50'   },
    { label: 'Costo Nómina Mes',   value: '—', icon: DollarSign,  color: 'text-green-600',  bgColor: 'bg-green-50'  },
    { label: 'Departamentos',      value: '—', icon: Building2,   color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { label: 'Horas Pendientes',   value: '—', icon: Clock,       color: 'text-orange-600', bgColor: 'bg-orange-50' },
  ],
  RRHH: [
    { label: 'Empleados Activos',  value: '—', icon: Users,       color: 'text-blue-600',   bgColor: 'bg-blue-50'   },
    { label: 'En Licencia',        value: '—', icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { label: 'Nómina Pendiente',   value: '—', icon: FileText,    color: 'text-red-600',    bgColor: 'bg-red-50'    },
    { label: 'Sin Afiliación',     value: '—', icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  ],
  CONTABILIDAD: [
    { label: 'Nómina Total Mes',   value: '—', icon: DollarSign,  color: 'text-green-600',  bgColor: 'bg-green-50'  },
    { label: 'Pagos Pendientes',   value: '—', icon: Clock,       color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { label: 'Pagos Completados',  value: '—', icon: CheckCircle, color: 'text-blue-600',   bgColor: 'bg-blue-50'   },
    { label: 'Crecimiento Nómina', value: '—', icon: TrendingUp,  color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ],
  SUPERVISOR: [
    { label: 'Mi Departamento',    value: '—', icon: Users,       color: 'text-blue-600',   bgColor: 'bg-blue-50'   },
    { label: 'Horas por Aprobar',  value: '—', icon: Clock,       color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { label: 'Horas Este Mes',     value: '—', icon: TrendingUp,  color: 'text-green-600',  bgColor: 'bg-green-50'  },
    { label: 'Ausencias',          value: '—', icon: AlertCircle, color: 'text-red-600',    bgColor: 'bg-red-50'    },
  ],
  EMPLEADO: [
    { label: 'Mi Sueldo Neto',     value: '—', icon: DollarSign,  color: 'text-green-600',  bgColor: 'bg-green-50'  },
    { label: 'Horas Este Mes',     value: '—', icon: Clock,       color: 'text-blue-600',   bgColor: 'bg-blue-50'   },
    { label: 'Horas Extra',        value: '—', icon: TrendingUp,  color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { label: 'Recibos Disponibles',value: '—', icon: FileText,    color: 'text-orange-600', bgColor: 'bg-orange-50' },
  ],
};

const ROLE_WELCOME: Record<string, string> = {
  ADMIN:        'Tienes acceso completo al sistema.',
  RRHH:         'Gestiona empleados, nómina y afiliaciones.',
  CONTABILIDAD: 'Revisa y procesa los períodos de pago.',
  SUPERVISOR:   'Consulta y aprueba las horas de tu equipo.',
  EMPLEADO:     'Consulta tus datos personales y recibos de pago.',
};

export default function Dashboard() {
  const { user } = useAuth();

  const primaryRole = user?.roles[0] ?? 'EMPLEADO';
  const kpis = KPI_BY_ROLE[primaryRole] ?? KPI_BY_ROLE['EMPLEADO'];
  const welcome = ROLE_WELCOME[primaryRole] ?? '';

  const displayName = user?.empleado
    ? `${user.empleado.nombres} ${user.empleado.apellidos}`
    : user?.username ?? '';

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {displayName}
        </h1>
        <p className="mt-1 text-gray-500">{welcome}</p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{kpi.value}</p>
                {kpi.subtext && (
                  <p className="mt-0.5 text-xs text-gray-400">{kpi.subtext}</p>
                )}
              </div>
              <div className={`rounded-xl p-3 ${kpi.bgColor}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder para gráficos — se implementará en módulo de estadísticas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-800">
            Evolución de Nómina
          </h3>
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400">
            Disponible en Módulo de Estadísticas
          </div>
        </div>
        <div className="card p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-800">
            Distribución por Departamento
          </h3>
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400">
            Disponible en Módulo de Estadísticas
          </div>
        </div>
      </div>
    </div>
  );
}
