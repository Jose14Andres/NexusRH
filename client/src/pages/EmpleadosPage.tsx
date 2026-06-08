import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Eye, Pencil, UserMinus, Search } from 'lucide-react';
import { empleadoApi, Empleado, CreateEmpleadoDto } from '../api/empleado';
import { departamentoApi, Departamento } from '../api/departamento';
import { cargoApi, Cargo } from '../api/cargo';
import { useAuth } from '../features/auth/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO:   'bg-green-50 text-green-700',
  INACTIVO: 'bg-red-50 text-red-700',
  LICENCIA: 'bg-yellow-50 text-yellow-700',
};

const emptyForm = (): CreateEmpleadoDto => ({
  cedula: '', nombres: '', apellidos: '', email: '',
  telefono: '', fechaIngreso: '', cargoId: '', departamentoId: '',
  estado: 'ACTIVO',
});

function extractError(err: unknown): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error inesperado';
}

export default function EmpleadosPage() {
  const { hasPermission } = useAuth();
  const canWrite  = hasPermission('empleado:write');
  const canDelete = hasPermission('empleado:delete');

  const [resp, setResp]         = useState<{ data: Empleado[]; total: number; totalPages: number } | null>(null);
  const [depts, setDepts]       = useState<Departamento[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Filtros
  const [filterDept, setFilterDept]     = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterQ, setFilterQ]           = useState('');
  const [page, setPage]                 = useState(1);

  // Modal crear / editar
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Empleado | null>(null);
  const [form, setForm]             = useState<CreateEmpleadoDto>(emptyForm());
  const [formCargos, setFormCargos] = useState<Cargo[]>([]);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  // Confirmar desactivación
  const [deleteTarget, setDeleteTarget] = useState<Empleado | null>(null);
  const [deleting, setDeleting]         = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page };
      if (filterDept)   params.departamentoId = filterDept;
      if (filterEstado) params.estado         = filterEstado;
      if (filterQ)      params.q              = filterQ;

      const [data, deptList] = await Promise.all([
        empleadoApi.list(params),
        departamentoApi.list(),
      ]);
      setResp(data);
      setDepts(deptList);
    } catch {
      setError('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterDept, filterEstado, filterQ, page]);

  // Cargos del departamento seleccionado en el formulario
  useEffect(() => {
    if (!form.departamentoId) { setFormCargos([]); return; }
    cargoApi.list(form.departamentoId)
      .then(setFormCargos)
      .catch(() => setFormCargos([]));
  }, [form.departamentoId]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(e: Empleado) {
    setEditing(e);
    setForm({
      cedula:         e.cedula,
      nombres:        e.nombres,
      apellidos:      e.apellidos,
      email:          e.email,
      telefono:       e.telefono ?? '',
      fechaIngreso:   e.fechaIngreso.slice(0, 10),
      fechaSalida:    e.fechaSalida?.slice(0, 10) ?? '',
      estado:         e.estado,
      cargoId:        e.cargoId,
      departamentoId: e.departamentoId,
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const { cedula: _c, ...updateData } = form;
        await empleadoApi.update(editing.id, {
          ...updateData,
          telefono: updateData.telefono || undefined,
          fechaSalida: updateData.fechaSalida || undefined,
        });
      } else {
        await empleadoApi.create({
          ...form,
          telefono: form.telefono || undefined,
        });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await empleadoApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(extractError(err));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const formValid =
    form.cedula.length === 10 &&
    form.nombres.trim() &&
    form.apellidos.trim() &&
    form.email.includes('@') &&
    form.fechaIngreso &&
    form.cargoId &&
    form.departamentoId;

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
        title="Empleados"
        subtitle="Gestión del personal de la organización"
        action={canWrite ? { label: 'Nuevo empleado', onClick: openCreate } : undefined}
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
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre, cédula o email…"
            value={filterQ}
            onChange={e => { setFilterQ(e.target.value); setPage(1); }}
          />
        </div>

        <select
          className="input w-auto"
          value={filterDept}
          onChange={e => { setFilterDept(e.target.value); setPage(1); }}
        >
          <option value="">Todos los departamentos</option>
          {depts.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>

        <select
          className="input w-auto"
          value={filterEstado}
          onChange={e => { setFilterEstado(e.target.value); setPage(1); }}
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
          <option value="LICENCIA">Licencia</option>
        </select>
      </div>

      {resp?.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin empleados registrados"
          description="Crea el primer empleado para comenzar"
          action={canWrite ? { label: 'Nuevo empleado', onClick: openCreate } : undefined}
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Empleado', 'Cédula', 'Cargo / Departamento', 'Contacto', 'Estado', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {resp?.data.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 uppercase">
                          {e.nombres.charAt(0)}{e.apellidos.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{e.apellidos}, {e.nombres}</p>
                          <p className="text-xs text-gray-400">
                            Desde {new Date(e.fechaIngreso).toLocaleDateString('es-EC')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-sm text-gray-600">{e.cedula}</td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800">{e.cargo.nombre}</p>
                      <p className="text-xs text-gray-500">{e.departamento.nombre}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{e.email}</p>
                      {e.telefono && <p className="text-xs text-gray-400">{e.telefono}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${ESTADO_BADGE[e.estado] ?? 'bg-gray-50 text-gray-600'}`}>
                        {e.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/empleados/${e.id}`}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Ver ficha"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canWrite && (
                          <button
                            onClick={() => openEdit(e)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && e.estado === 'ACTIVO' && (
                          <button
                            onClick={() => setDeleteTarget(e)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="Desactivar"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {resp && resp.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>{resp.total} empleado(s)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary px-3 py-1 disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="px-2 py-1">Pág. {page} de {resp.totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(resp.totalPages, p + 1))}
                  disabled={page === resp.totalPages}
                  className="btn-secondary px-3 py-1 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar empleado' : 'Nuevo empleado'}
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Cédula solo en creación */}
          {!editing && (
            <div>
              <label className="label">Cédula *</label>
              <input
                className="input font-mono"
                maxLength={10}
                placeholder="10 dígitos"
                value={form.cedula}
                onChange={e => setForm(f => ({ ...f, cedula: e.target.value.replace(/\D/g, '') }))}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombres *</label>
              <input className="input" value={form.nombres}
                onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} />
            </div>
            <div>
              <label className="label">Apellidos *</label>
              <input className="input" value={form.apellidos}
                onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={form.telefono ?? ''}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
          </div>
          <div>
            <label className="label">Departamento *</label>
            <select
              className="input"
              value={form.departamentoId}
              onChange={e => setForm(f => ({ ...f, departamentoId: e.target.value, cargoId: '' }))}
            >
              <option value="">Selecciona departamento</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cargo *</label>
            <select
              className="input"
              value={form.cargoId}
              disabled={!form.departamentoId}
              onChange={e => setForm(f => ({ ...f, cargoId: e.target.value }))}
            >
              <option value="">
                {form.departamentoId ? 'Selecciona cargo' : 'Primero selecciona departamento'}
              </option>
              {formCargos.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} — ${c.sueldoBase.toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha de ingreso *</label>
              <input className="input" type="date" value={form.fechaIngreso}
                onChange={e => setForm(f => ({ ...f, fechaIngreso: e.target.value }))} />
            </div>
            {editing && (
              <div>
                <label className="label">Estado</label>
                <select
                  className="input"
                  value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value as 'ACTIVO' | 'INACTIVO' | 'LICENCIA' }))}
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="LICENCIA">Licencia</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !formValid}
            className="btn-primary"
          >
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear empleado'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeactivate}
        isLoading={deleting}
        title="Desactivar empleado"
        message={`¿Seguro que deseas desactivar a "${deleteTarget?.nombres} ${deleteTarget?.apellidos}"? Se cambiará su estado a INACTIVO.`}
      />
    </div>
  );
}
