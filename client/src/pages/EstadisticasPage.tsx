import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart2, TrendingUp, Clock, DollarSign, Users, PieChart as PieIcon } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import PageHeader from '../components/PageHeader';
import {
  estadisticasApi,
  HistorialSalarialItem,
  HorasMesItem,
  AportacionesData,
  CostoDeptItem,
  AfiliacionData,
  DistribucionCargoItem,
  EvolucionMesItem,
} from '../api/estadisticas';

// ─── Helpers ──────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

const PIE_COLORS = ['#2563eb', '#94a3b8'];
const BAR_COLORS = ['#2563eb', '#60a5fa', '#34d399', '#f59e0b', '#f87171', '#a78bfa'];
const thisYear = new Date().getFullYear();
const thisMonth = new Date().getMonth() + 1;

type Tab = 'individual' | 'departamento' | 'organizacion';

function NoData() {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-gray-400">
      Sin datos para el período seleccionado
    </div>
  );
}

// ─── Sub-secciones ────────────────────────────────────────

function HistorialChart({ data }: { data: HistorialSalarialItem[] }) {
  const hasData = data.some(d => d.sueldoNeto > 0);
  if (!hasData) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
        <Tooltip formatter={(v: number) => fmt(v)} />
        <Legend />
        <Line type="monotone" dataKey="sueldoNeto"   name="Sueldo Neto"  stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="sueldoBruto"  name="Sueldo Bruto" stroke="#60a5fa" strokeWidth={2} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function HorasChart({ data }: { data: HorasMesItem[] }) {
  const hasData = data.some(d => d.horasNormales > 0 || d.horasExtras > 0);
  if (!hasData) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="horasNormales" name="Horas Normales" fill="#2563eb" radius={[3,3,0,0]} />
        <Bar dataKey="horasExtras"   name="Horas Extra"    fill="#f59e0b" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AfiliacionChart({ data }: { data: AfiliacionData }) {
  const pieData = [
    { name: 'Con IESS', value: data.conIESS },
    { name: 'Sin IESS', value: data.sinIESS },
  ];
  if (data.total === 0) return <NoData />;
  return (
    <div className="flex items-center gap-6">
      <ResponsiveContainer width={180} height={180}>
        <PieChart>
          <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
          </Pie>
          <Tooltip formatter={(v: number, name: string) => [`${v} empleados`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-3 text-sm">
        {pieData.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
            <span className="text-gray-600">{d.name}</span>
            <span className="font-semibold text-gray-900">{d.value}</span>
          </div>
        ))}
        <div className="pt-1 text-base font-bold text-primary-700">{data.pctIESS}% afiliados</div>
      </div>
    </div>
  );
}

function DistribucionCargosChart({ data }: { data: DistribucionCargoItem[] }) {
  if (data.length === 0) return <NoData />;
  const sorted = [...data].sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 36)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 40, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
        <YAxis type="category" dataKey="cargo" width={130} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="cantidad" name="Empleados" radius={[0,3,3,0]}>
          {sorted.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EvolucionNominaChart({ data }: { data: EvolucionMesItem[] }) {
  const hasData = data.some(d => d.totalNeto > 0);
  if (!hasData) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
        <Tooltip formatter={(v: number) => fmt(v)} />
        <Legend />
        <Line type="monotone" dataKey="totalNeto"  name="Total Neto"  stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="totalBruto" name="Total Bruto" stroke="#60a5fa" strokeWidth={2} dot={false} strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Page principal ───────────────────────────────────────

export default function EstadisticasPage() {
  const { user, hasPermission } = useAuth();
  const canReadDept = hasPermission('estadisticas:read:dept');
  const canReadOrg  = hasPermission('estadisticas:read:org');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'individual',   label: 'Individual' },
    ...(canReadDept ? [{ id: 'departamento' as Tab, label: 'Departamento' }] : []),
    ...(canReadOrg  ? [{ id: 'organizacion' as Tab, label: 'Organización' }] : []),
  ];

  const [tab, setTab] = useState<Tab>('individual');

  // Individual
  const [historial, setHistorial]   = useState<HistorialSalarialItem[]>([]);
  const [horas, setHoras]           = useState<HorasMesItem[]>([]);
  const [aport, setAport]           = useState<AportacionesData | null>(null);
  const [anioInd, setAnioInd]       = useState(thisYear);

  // Departamento
  const [costoDept, setCostoDept]   = useState<CostoDeptItem[]>([]);
  const [mesDept, setMesDept]       = useState(thisMonth);
  const [anioDept, setAnioDept]     = useState(thisYear);

  // Org
  const [afiliacion, setAfiliacion] = useState<AfiliacionData | null>(null);
  const [distCargos, setDistCargos] = useState<DistribucionCargoItem[]>([]);
  const [evolucion, setEvolucion]   = useState<EvolucionMesItem[]>([]);
  const [anioOrg, setAnioOrg]       = useState(thisYear);

  const [loadingInd,  setLoadingInd]  = useState(false);
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingOrg,  setLoadingOrg]  = useState(false);

  useEffect(() => {
    setLoadingInd(true);
    Promise.all([
      estadisticasApi.historialSalarial({ ultimos: 12 }),
      estadisticasApi.horas({ anio: anioInd }),
      estadisticasApi.aportaciones({ anio: anioInd }),
    ]).then(([h, hr, ap]) => {
      setHistorial(h);
      setHoras(hr);
      setAport(ap);
    }).finally(() => setLoadingInd(false));
  }, [anioInd]);

  useEffect(() => {
    if (!canReadDept) return;
    setLoadingDept(true);
    estadisticasApi.costoDepartamento({ mes: mesDept, anio: anioDept })
      .then(setCostoDept)
      .finally(() => setLoadingDept(false));
  }, [canReadDept, mesDept, anioDept]);

  useEffect(() => {
    if (!canReadOrg) return;
    setLoadingOrg(true);
    Promise.all([
      estadisticasApi.afiliacion(),
      estadisticasApi.distribucionCargos(),
      estadisticasApi.evolucionNomina({ anio: anioOrg }),
    ]).then(([af, dc, ev]) => {
      setAfiliacion(af);
      setDistCargos(dc);
      setEvolucion(ev);
    }).finally(() => setLoadingOrg(false));
  }, [canReadOrg, anioOrg]);

  const primaryRole = user?.roles[0] ?? 'EMPLEADO';

  return (
    <div>
      <PageHeader
        title="Estadísticas"
        subtitle={`Vista ${primaryRole.toLowerCase()} — datos del sistema NexusRH`}
        icon={<BarChart2 className="h-6 w-6 text-white" />}
      />

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB: Individual */}
      {tab === 'individual' && (
        <div className="space-y-6">
          {/* Filtro año */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Año:</label>
            <select
              value={anioInd}
              onChange={e => setAnioInd(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              {[thisYear, thisYear - 1, thisYear - 2].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {loadingInd ? (
            <div className="flex h-32 items-center justify-center text-gray-400">Cargando...</div>
          ) : (
            <>
              {/* Historial salarial */}
              <div className="card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                  <h3 className="text-base font-semibold text-gray-800">Evolución Salarial (últimos 12 meses)</h3>
                </div>
                <HistorialChart data={historial} />
              </div>

              {/* Horas */}
              <div className="card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary-600" />
                  <h3 className="text-base font-semibold text-gray-800">Horas por Mes — {anioInd}</h3>
                </div>
                <HorasChart data={horas} />
              </div>

              {/* Aportaciones */}
              {aport && (
                <div className="card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary-600" />
                    <h3 className="text-base font-semibold text-gray-800">Aportes IESS — {anioInd}</h3>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-xs text-blue-600">Aporte personal total</p>
                      <p className="mt-1 text-lg font-bold text-blue-800">{fmt(aport.totalAportePersonal)}</p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-xs text-green-600">Aporte patronal total</p>
                      <p className="mt-1 text-lg font-bold text-green-800">{fmt(aport.totalAportePatronal)}</p>
                    </div>
                  </div>
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                          <th className="py-2 pr-4">Mes</th>
                          <th className="py-2 pr-4">Aporte Personal</th>
                          <th className="py-2">Aporte Patronal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aport.detalle.map(d => (
                          <tr key={d.mes} className="border-b border-gray-50">
                            <td className="py-2 pr-4 font-medium text-gray-700">{d.label}</td>
                            <td className="py-2 pr-4 text-gray-600">{d.aportePersonal > 0 ? fmt(d.aportePersonal) : '—'}</td>
                            <td className="py-2 text-gray-600">{d.aportePatronal > 0 ? fmt(d.aportePatronal) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: Departamento */}
      {tab === 'departamento' && canReadDept && (
        <div className="space-y-6">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Mes:</label>
              <select
                value={mesDept}
                onChange={e => setMesDept(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              >
                {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Año:</label>
              <select
                value={anioDept}
                onChange={e => setAnioDept(Number(e.target.value))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              >
                {[thisYear, thisYear - 1, thisYear - 2].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {loadingDept ? (
            <div className="flex h-32 items-center justify-center text-gray-400">Cargando...</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-base font-semibold text-gray-800">
                  Costo de Nómina por Departamento
                </h3>
              </div>
              {costoDept.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                  Sin nóminas para el período seleccionado
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-6 py-3 text-left">Departamento</th>
                        <th className="px-6 py-3 text-right">Empleados</th>
                        <th className="px-6 py-3 text-right">Total Bruto</th>
                        <th className="px-6 py-3 text-right">Total Neto</th>
                        <th className="px-6 py-3 text-right">Costo Patronal</th>
                        <th className="px-6 py-3 text-right">Costo Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {costoDept.map(d => (
                        <tr key={d.departamentoId} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-800">{d.departamento}</td>
                          <td className="px-6 py-3 text-right text-gray-600">{d.cantEmpleados}</td>
                          <td className="px-6 py-3 text-right text-gray-600">{fmt(d.totalBruto)}</td>
                          <td className="px-6 py-3 text-right text-gray-600">{fmt(d.totalNeto)}</td>
                          <td className="px-6 py-3 text-right text-gray-600">{fmt(d.totalPatronal)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-gray-800">{fmt(d.totalBruto + d.totalPatronal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: Organización */}
      {tab === 'organizacion' && canReadOrg && (
        <div className="space-y-6">
          {/* Filtro año para evolución */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Año evolución:</label>
            <select
              value={anioOrg}
              onChange={e => setAnioOrg(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              {[thisYear, thisYear - 1, thisYear - 2].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {loadingOrg ? (
            <div className="flex h-32 items-center justify-center text-gray-400">Cargando...</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Afiliación */}
              {afiliacion && (
                <div className="card p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <PieIcon className="h-5 w-5 text-primary-600" />
                    <h3 className="text-base font-semibold text-gray-800">Afiliación IESS</h3>
                  </div>
                  <AfiliacionChart data={afiliacion} />
                </div>
              )}

              {/* Distribución por cargo */}
              <div className="card p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary-600" />
                  <h3 className="text-base font-semibold text-gray-800">Distribución por Cargo</h3>
                </div>
                <DistribucionCargosChart data={distCargos} />
              </div>

              {/* Evolución nómina */}
              <div className="card p-6 lg:col-span-2">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                  <h3 className="text-base font-semibold text-gray-800">Evolución de Nómina — {anioOrg}</h3>
                </div>
                <EvolucionNominaChart data={evolucion} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
