import { useEffect, useState } from 'react';
import { Clock, Plus, Trash2, Search } from 'lucide-react';
import { horasApi, RegistroHoras, CreateHorasDto } from '../api/horas';
import { useAuth } from '../features/auth/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ExportMenu from '../components/ExportMenu';

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'bg-yellow-50 text-yellow-700',
  APROBADO:  'bg-green-50 text-green-700',
  RECHAZADO: 'bg-red-50 text-red-700',
};

function extractError(err: unknown): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error inesperado';
}

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const thisYear = new Date().getFullYear();
const thisMonth = new Date().getMonth() + 1;

export default function HorasPage() {
  const { user, hasPermission } = useAuth();
  const canWrite  = hasPermission('horas:write');
  const canExport = hasPermission('horas:export');
  const isPriv    = user?.roles.some(r => ['ADMIN', 'RRHH'].includes(r)) ?? false;

  // Filtros
  const [mes, setMes]     = useState(thisMonth);
  const [anio, setAnio]   = useState(thisYear);
  const [filterQ, setQ]   = useState('');
  const [page, setPage]   = useState(1);

  const [resp, setResp]     = useState<{ data: RegistroHoras[]; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Modal nuevo registro
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateHorasDto>({
    empleadoId: user?.empleadoId ?? '',
    fecha: new Date().toISOString().slice(0, 10),
    horasNormales: 8,
    horasExtras: 0,
    observacion: '',
  });
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');

  // Confirmar eliminación
  const [deleteTarget, setDeleteTarget] = useState<RegistroHoras | null>(null);
  const [deleting, setDeleting]         = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { mes, anio, page };
      if (!isPriv && user?.empleadoId) params.empleadoId = user.empleadoId;
      const data = await horasApi.list(params);
      setResp(data);
    } catch {
      setError('Error al cargar registros de horas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [mes, anio, page]);

  function openModal() {
    setForm({
      empleadoId: user?.empleadoId ?? '',
      fecha: new Date().toISOString().slice(0, 10),
      horasNormales: 8,
      horasExtras: 0,
      observacion: '',
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError('');
    try {
      await horasApi.create({
        ...form,
        horasNormales: Number(form.horasNormales),
        horasExtras: Number(form.horasExtras),
        observacion: form.observacion || undefined,
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await horasApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = filterQ
    ? resp?.data.filter(r =>
        `${r.empleado.nombres} ${r.empleado.apellidos}`.toLowerCase().includes(filterQ.toLowerCase()) ||
        r.empleado.cedula.includes(filterQ)
      )
    : resp?.data;

  const formValid =
    form.empleadoId &&
    form.fecha &&
    form.horasNormales >= 0 &&
    form.horasExtras >= 0 &&
    Number(form.horasNormales) + Number(form.horasExtras) <= 24;

  if (loading && !resp) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Registro de Horas"
        subtitle="Horas trabajadas por empleado"
        action={canWrite ? { label: 'Registrar horas', onClick: openModal } : undefined}
        canAction={canWrite}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-3 underline">Cerrar</button>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          className="input w-auto"
          value={mes}
          onChange={e => { setMes(Number(e.target.value)); setPage(1); }}
        >
          {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>

        <select
          className="input w-auto"
          value={anio}
          onChange={e => { setAnio(Number(e.target.value)); setPage(1); }}
        >
          {[thisYear - 1, thisYear, thisYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {isPriv && (
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Buscar empleado…"
              value={filterQ}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        )}

        {canExport && (
          <div className="ml-auto">
            <ExportMenu
              entidad="horas"
              filtros={{
                desde: `${anio}-${String(mes).padStart(2, '0')}-01`,
                hasta: `${anio}-${String(mes).padStart(2, '0')}-${String(new Date(anio, mes, 0).getDate()).padStart(2, '0')}`,
              }}
            />
          </div>
        )}
      </div>

      {filtered?.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Sin registros de horas"
          description={`No hay registros para ${MESES[mes - 1]} ${anio}`}
          action={canWrite ? { label: 'Registrar horas', onClick: openModal } : undefined}
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Empleado', 'Fecha', 'H. Normales', 'H. Extras', 'Estado', 'Observación', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filtered?.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {r.empleado.apellidos}, {r.empleado.nombres}
                      </p>
                      <p className="text-xs text-gray-400">{r.empleado.departamento.nombre}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(r.fecha).toLocaleDateString('es-EC')}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-mono text-gray-700">
                      {r.horasNormales.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-mono text-gray-700">
                      {r.horasExtras > 0
                        ? <span className="font-semibold text-orange-600">{r.horasExtras.toFixed(1)}</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ESTADO_BADGE[r.estado] ?? 'bg-gray-50 text-gray-600'}`}>
                        {r.estado}
                      </span>
                      {r.estado === 'RECHAZADO' && r.motivoRechazo && (
                        <p className="mt-0.5 text-xs text-red-500">{r.motivoRechazo}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                      {r.observacion ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canWrite && r.estado === 'PENDIENTE' &&
                        (isPriv || r.empleadoId === user?.empleadoId) && (
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resp && resp.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>{resp.total} registro(s)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary px-3 py-1 disabled:opacity-40"
                >Anterior</button>
                <span className="px-2 py-1">Pág. {page} de {resp.totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(resp.totalPages, p + 1))}
                  disabled={page === resp.totalPages}
                  className="btn-secondary px-3 py-1 disabled:opacity-40"
                >Siguiente</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal nuevo registro */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Registrar horas">
        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="label">Fecha *</label>
            <input
              className="input"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Horas normales *</label>
              <input
                className="input font-mono"
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={form.horasNormales}
                onChange={e => setForm(f => ({ ...f, horasNormales: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="label">Horas extras</label>
              <input
                className="input font-mono"
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={form.horasExtras}
                onChange={e => setForm(f => ({ ...f, horasExtras: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          {Number(form.horasNormales) + Number(form.horasExtras) > 24 && (
            <p className="text-xs text-red-600">La suma no puede superar 24 horas</p>
          )}
          <div>
            <label className="label">Observación</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.observacion ?? ''}
              onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))}
              placeholder="Opcional…"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !formValid}
            className="btn-primary flex items-center gap-2"
          >
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {saving ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Eliminar registro"
        message={`¿Eliminar el registro de ${new Date(deleteTarget?.fecha ?? '').toLocaleDateString('es-EC')}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
