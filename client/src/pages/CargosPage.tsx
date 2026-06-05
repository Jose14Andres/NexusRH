import { useEffect, useState } from 'react';
import { Briefcase, Pencil, Trash2, DollarSign, Clock } from 'lucide-react';
import { cargoApi, Cargo, CreateCargoDto } from '../api/cargo';
import { departamentoApi, Departamento } from '../api/departamento';
import { useAuth } from '../features/auth/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const emptyForm: CreateCargoDto = {
  nombre: '',
  descripcion: '',
  departamentoId: '',
  sueldoBase: 0,
  jornadaHoras: 8,
};

function fmt(n: number) {
  return n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

export default function CargosPage() {
  const { hasPermission } = useAuth();
  const canWrite  = hasPermission('cargo:write');
  const canDelete = hasPermission('cargo:delete');

  const [items, setItems]               = useState<Cargo[]>([]);
  const [depts, setDepts]               = useState<Departamento[]>([]);
  const [filterDept, setFilterDept]     = useState('');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  const [modalOpen, setModalOpen]       = useState(false);
  const [editing, setEditing]           = useState<Cargo | null>(null);
  const [form, setForm]                 = useState<CreateCargoDto>(emptyForm);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Cargo | null>(null);
  const [deleting, setDeleting]         = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [cargos, depsList] = await Promise.all([
        cargoApi.list(filterDept || undefined),
        departamentoApi.list(),
      ]);
      setItems(cargos);
      setDepts(depsList);
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterDept]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, departamentoId: depts[0]?.id ?? '' });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(c: Cargo) {
    setEditing(c);
    setForm({
      nombre: c.nombre,
      descripcion: c.descripcion ?? '',
      departamentoId: c.departamentoId,
      sueldoBase: c.sueldoBase,
      jornadaHoras: c.jornadaHoras,
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, sueldoBase: Number(form.sueldoBase) };
      if (editing) {
        await cargoApi.update(editing.id, payload);
      } else {
        await cargoApi.create(payload);
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Error al guardar';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await cargoApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Error al eliminar';
      setError(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Cargos"
        subtitle="Roles laborales y estructura salarial"
        action={canWrite ? { label: 'Nuevo cargo', onClick: openCreate } : undefined}
        canAction={canWrite}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-3 underline">Cerrar</button>
        </div>
      )}

      {/* Filtro por departamento */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Departamento:</label>
        <select
          className="input w-auto"
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
        >
          <option value="">Todos</option>
          {depts.map(d => (
            <option key={d.id} value={d.id}>
              {d.nombre} — {d.organizacion.nombre}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Sin cargos registrados"
          description="Define los cargos para asignarlos a los empleados y calcular nómina"
          action={canWrite ? { label: 'Crear cargo', onClick: openCreate } : undefined}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Cargo', 'Departamento', 'Sueldo Base', 'Jornada', 'Empleados', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                        <Briefcase className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{c.nombre}</p>
                        {c.descripcion && (
                          <p className="text-xs text-gray-400 truncate max-w-[180px]">{c.descripcion}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">
                    <div>{c.departamento.nombre}</div>
                    <div className="text-xs text-gray-400">{c.departamento.organizacion.nombre}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-sm font-semibold text-green-700">
                      <DollarSign className="h-3 w-3" />
                      {fmt(c.sueldoBase)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {c.jornadaHoras}h/día
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="badge bg-blue-50 text-blue-700">{c._count.empleados} empl.</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      {canWrite && (
                        <button
                          onClick={() => openEdit(c)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Eliminar"
                          disabled={c._count.empleados > 0}
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
      )}

      {/* Modal crear/editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar cargo' : 'Nuevo cargo'}
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Nombre *</label>
            <input
              className="input"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Analista de Sistemas"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Descripción</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.descripcion ?? ''}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción del cargo..."
            />
          </div>
          <div className="col-span-2">
            <label className="label">Departamento *</label>
            <select
              className="input"
              value={form.departamentoId}
              onChange={e => setForm(f => ({ ...f, departamentoId: e.target.value }))}
            >
              <option value="">Selecciona un departamento</option>
              {depts.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nombre} — {d.organizacion.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Sueldo Base (USD) *</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input"
              value={form.sueldoBase}
              onChange={e => setForm(f => ({ ...f, sueldoBase: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label">Jornada (horas/día)</label>
            <input
              type="number"
              min={1}
              max={24}
              className="input"
              value={form.jornadaHoras}
              onChange={e => setForm(f => ({ ...f, jornadaHoras: parseInt(e.target.value) || 8 }))}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.nombre || !form.departamentoId || form.sueldoBase <= 0}
            className="btn-primary"
          >
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear cargo'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Eliminar cargo"
        message={`¿Seguro que deseas eliminar el cargo "${deleteTarget?.nombre}"?`}
      />
    </div>
  );
}
