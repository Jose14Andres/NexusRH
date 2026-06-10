import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Calculator, Eye, Trash2, CheckCircle, Banknote } from 'lucide-react';
import { nominaApi, Nomina, EstadoNomina } from '../api/nomina';
import { useAuth } from '../features/auth/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const ESTADO_BADGE: Record<EstadoNomina, string> = {
  PENDIENTE:  'bg-gray-100 text-gray-700',
  CALCULADO:  'bg-yellow-50 text-yellow-700',
  APROBADO:   'bg-blue-50 text-blue-700',
  PAGADO:     'bg-green-50 text-green-700',
};

function fmt(n: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(n);
}

function extractError(err: unknown): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error inesperado';
}

const thisYear  = new Date().getFullYear();
const thisMonth = new Date().getMonth() + 1;

export default function NominaPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canWrite   = hasPermission('nomina:write');
  const canApprove = hasPermission('nomina:approve');

  // Filtros
  const [mes, setMes]     = useState(thisMonth);
  const [anio, setAnio]   = useState(thisYear);
  const [estado, setEstado] = useState<EstadoNomina | ''>('');
  const [page, setPage]   = useState(1);

  const [resp, setResp]       = useState<{ data: Nomina[]; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Modal calcular
  const [calcModal, setCalcModal]   = useState(false);
  const [calcMes, setCalcMes]       = useState(thisMonth);
  const [calcAnio, setCalcAnio]     = useState(thisYear);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError]   = useState('');

  // Confirm eliminar
  const [deleteTarget, setDeleteTarget] = useState<Nomina | null>(null);
  const [deleting, setDeleting]         = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number | undefined> = { mes, anio, page };
      if (estado) params.estado = estado;
      const data = await nominaApi.list(params);
      setResp(data);
    } catch {
      setError('Error al cargar nóminas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [mes, anio, estado, page]);

  async function handleCalcular() {
    setCalculating(true);
    setCalcError('');
    try {
      const result = await nominaApi.calcular({ mes: calcMes, anio: calcAnio });
      setCalcModal(false);
      await load();
      alert(`Nómina calculada: ${result.calculadas} empleado(s) procesados para ${MESES[calcMes - 1]} ${calcAnio}.${result.errores > 0 ? `\n${result.errores} error(es) al procesar.` : ''}`);
    } catch (err) {
      setCalcError(extractError(err));
    } finally {
      setCalculating(false);
    }
  }

  async function handleDelete(nomina: Nomina) {
    setDeleting(true);
    try {
      await nominaApi.remove(nomina.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      alert(extractError(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleAprobar(nomina: Nomina) {
    try {
      await nominaApi.aprobar(nomina.id);
      await load();
    } catch (err) {
      alert(extractError(err));
    }
  }

  const YEARS = Array.from({ length: 5 }, (_, i) => thisYear - 2 + i);

  return (
    <div>
      <PageHeader
        icon={<DollarSign className="h-5 w-5" />}
        title="Nómina"
        subtitle={`${resp?.total ?? '...'} registros para ${MESES[mes - 1]} ${anio}`}
        actions={
          canWrite ? (
            <button
              onClick={() => { setCalcMes(thisMonth); setCalcAnio(thisYear); setCalcError(''); setCalcModal(true); }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              Calcular período
            </button>
          ) : undefined
        }
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={mes}
          onChange={e => { setMes(Number(e.target.value)); setPage(1); }}
          className="input w-36"
        >
          {MESES.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={anio}
          onChange={e => { setAnio(Number(e.target.value)); setPage(1); }}
          className="input w-28"
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={estado}
          onChange={e => { setEstado(e.target.value as EstadoNomina | ''); setPage(1); }}
          className="input w-40"
        >
          <option value="">Todos los estados</option>
          <option value="CALCULADO">Calculado</option>
          <option value="APROBADO">Aprobado</option>
          <option value="PAGADO">Pagado</option>
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500">Cargando...</div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : !resp || resp.data.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="h-8 w-8 text-gray-400" />}
          title="Sin nóminas"
          description={canWrite ? 'Usa "Calcular período" para generar las nóminas del mes.' : 'No hay nóminas registradas para este período.'}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Empleado</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Departamento</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Sueldo bruto</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Aporte IESS</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Neto a pagar</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Estado</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resp.data.map(n => (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {n.empleado.apellidos}, {n.empleado.nombres}
                      </div>
                      <div className="text-xs text-gray-400">{n.empleado.cargo.nombre}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{n.empleado.departamento.nombre}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(n.sueldoBruto)}</td>
                    <td className="px-4 py-3 text-right text-red-600">-{fmt(n.aportePersonal)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{fmt(n.sueldoNeto)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${ESTADO_BADGE[n.estado]}`}>{n.estado}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/nomina/${n.id}`)}
                          className="icon-btn text-gray-400 hover:text-primary-600"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canApprove && n.estado === 'CALCULADO' && (
                          <button
                            onClick={() => handleAprobar(n)}
                            className="icon-btn text-gray-400 hover:text-blue-600"
                            title="Aprobar"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {canWrite && n.estado === 'CALCULADO' && (
                          <button
                            onClick={() => setDeleteTarget(n)}
                            className="icon-btn text-gray-400 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen totales */}
          <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Total bruto</p>
              <p className="text-lg font-bold text-gray-900">
                {fmt(resp.data.reduce((s, n) => s + n.sueldoBruto, 0))}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Total IESS personal</p>
              <p className="text-lg font-bold text-red-600">
                -{fmt(resp.data.reduce((s, n) => s + n.aportePersonal, 0))}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Total neto a pagar</p>
              <p className="text-lg font-bold text-green-700">
                {fmt(resp.data.reduce((s, n) => s + n.sueldoNeto, 0))}
              </p>
            </div>
          </div>

          {/* Paginación */}
          {resp.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <span>Página {page} de {resp.totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(resp.totalPages, p + 1))}
                  disabled={page === resp.totalPages}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal calcular período */}
      <Modal
        isOpen={calcModal}
        onClose={() => !calculating && setCalcModal(false)}
        title="Calcular nómina del período"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Se generarán (o recalcularán) las nóminas de todos los empleados activos para el período seleccionado, incluyendo las horas extras aprobadas.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Mes</label>
              <select
                value={calcMes}
                onChange={e => setCalcMes(Number(e.target.value))}
                className="input"
                disabled={calculating}
              >
                {MESES.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Año</label>
              <select
                value={calcAnio}
                onChange={e => setCalcAnio(Number(e.target.value))}
                className="input"
                disabled={calculating}
              >
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          {calcError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{calcError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setCalcModal(false)}
              className="btn btn-secondary"
              disabled={calculating}
            >
              Cancelar
            </button>
            <button
              onClick={handleCalcular}
              disabled={calculating}
              className="btn btn-primary flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              {calculating ? 'Calculando...' : 'Calcular'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm eliminar */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Eliminar nómina"
        message={
          deleteTarget
            ? `¿Eliminar la nómina de ${deleteTarget.empleado.apellidos}, ${deleteTarget.empleado.nombres} para ${MESES[deleteTarget.mes - 1]} ${deleteTarget.anio}?`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
