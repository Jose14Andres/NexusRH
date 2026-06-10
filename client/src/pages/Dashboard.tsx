import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { estadisticasApi, DashboardData, KpiItem } from '../api/estadisticas';
import {
  Users, DollarSign, Clock, Building2,
  TrendingUp, CheckCircle, AlertCircle, FileText,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────

function fmt(n: number, format: KpiItem['format']): string {
  if (format === 'currency') {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
  }
  if (format === 'percent') return `${n > 0 ? '+' : ''}${n}%`;
  return n.toLocaleString('es-EC');
}

const KPI_ICON: Record<string, React.ElementType> = {
  empleados:       Users,
  costoNomina:     DollarSign,
  horasPendientes: Clock,
  nominaPendiente: FileText,
  enLicencia:      AlertCircle,
  afiliados:       CheckCircle,
  costoMes:        DollarSign,
  pendientes:      Clock,
  completados:     CheckCircle,
  crecimiento:     TrendingUp,
  miDept:          Users,
  licencias:       AlertCircle,
  sueldoNeto:      DollarSign,
  horasNorm:       Clock,
  horasExtra:      TrendingUp,
  recibos:         FileText,
};

const KPI_COLOR: Record<string, { text: string; bg: string }> = {
  empleados:       { text: 'text-blue-600',   bg: 'bg-blue-50'   },
  costoNomina:     { text: 'text-green-600',  bg: 'bg-green-50'  },
  horasPendientes: { text: 'text-orange-600', bg: 'bg-orange-50' },
  nominaPendiente: { text: 'text-red-600',    bg: 'bg-red-50'    },
  enLicencia:      { text: 'text-yellow-600', bg: 'bg-yellow-50' },
  afiliados:       { text: 'text-teal-600',   bg: 'bg-teal-50'   },
  costoMes:        { text: 'text-green-600',  bg: 'bg-green-50'  },
  pendientes:      { text: 'text-orange-600', bg: 'bg-orange-50' },
  completados:     { text: 'text-blue-600',   bg: 'bg-blue-50'   },
  crecimiento:     { text: 'text-purple-600', bg: 'bg-purple-50' },
  miDept:          { text: 'text-blue-600',   bg: 'bg-blue-50'   },
  licencias:       { text: 'text-red-600',    bg: 'bg-red-50'    },
  sueldoNeto:      { text: 'text-green-600',  bg: 'bg-green-50'  },
  horasNorm:       { text: 'text-blue-600',   bg: 'bg-blue-50'   },
  horasExtra:      { text: 'text-purple-600', bg: 'bg-purple-50' },
  recibos:         { text: 'text-orange-600', bg: 'bg-orange-50' },
};

const FALLBACK: { text: string; bg: string } = { text: 'text-gray-600', bg: 'bg-gray-50' };

const ROLE_WELCOME: Record<string, string> = {
  ADMIN:        'Tienes acceso completo al sistema.',
  RRHH:         'Gestiona empleados, nómina y afiliaciones.',
  CONTABILIDAD: 'Revisa y procesa los períodos de pago.',
  SUPERVISOR:   'Consulta y aprueba las horas de tu equipo.',
  EMPLEADO:     'Consulta tus datos personales y recibos de pago.',
};

function NoData() {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-gray-400">
      Sin datos disponibles
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    estadisticasApi.getDashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const primaryRole  = user?.roles[0] ?? 'EMPLEADO';
  const welcome      = ROLE_WELCOME[primaryRole] ?? '';
  const displayName  = user?.empleado
    ? `${user.empleado.nombres} ${user.empleado.apellidos}`
    : user?.username ?? '';

  const kpis = data?.kpis ?? [];
  const evol = data?.charts.evolucionNomina ?? [];
  const dist = data?.charts.distribucionDept ?? [];

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
      {loading ? (
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="card animate-pulse p-5 h-24" />
          ))}
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(kpi => {
            const Icon   = KPI_ICON[kpi.key]   ?? Building2;
            const colors = KPI_COLOR[kpi.key] ?? FALLBACK;
            return (
              <div key={kpi.key} className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{fmt(kpi.value, kpi.format)}</p>
                    {kpi.description && (
                      <p className="mt-0.5 text-xs text-gray-400">{kpi.description}</p>
                    )}
                  </div>
                  <div className={`rounded-xl p-3 ${colors.bg}`}>
                    <Icon className={`h-6 w-6 ${colors.text}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Evolución nómina */}
        <div className="card p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-800">Evolución de Nómina</h3>
          {loading ? (
            <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
          ) : evol.some(d => d.totalNeto > 0) ? (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={evol} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v: number) =>
                  new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)
                } />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="totalNeto"  name="Neto"  stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="totalBruto" name="Bruto" stroke="#60a5fa" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </div>

        {/* Distribución por departamento */}
        <div className="card p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-800">Distribución por Departamento</h3>
          {loading ? (
            <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
          ) : dist.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={dist} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="departamento" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cantidad" name="Empleados" fill="#2563eb" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </div>
      </div>
    </div>
  );
}
