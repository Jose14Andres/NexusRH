import { useEffect, useState } from 'react';
import { FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { departamentoApi, Departamento, CreateDepartamentoDto } from '../api/departamento';
import { organizacionApi, Organizacion } from '../api/organizacion';
import { extractErrorMessage } from '../utils/errors';
import { useAuth } from '../features/auth/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const emptyForm: CreateDepartamentoDto = { nombre: '', organizacionId: '' };

export default function DepartamentosPage() {
  const { hasPermission } = useAuth();
  const canWrite  = hasPermission('departamento:write');
  const canDelete = hasPermission('departamento:delete');

  const [items, setItems]               = useState<Departamento[]>([]);
  const [orgs, setOrgs]                 = useState<Organizacion[]>([]);
  const [filterOrg, setFilterOrg]       = useState('');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  const [modalOpen, setModalOpen]       = useState(false);
  const [editing, setEditing]           = useState<Departamento | null>(null);
  const [form, setForm]                 = useState<CreateDepartamentoDto>(emptyForm);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Departamento | null>(null);
  const [deleting, setDeleting]         = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [depts, orgsList] = await Promise.all([
        departamentoApi.list(filterOrg || undefined),
        organizacionApi.list(),
      ]);
      setItems(depts);
      setOrgs(orgsList);
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterOrg]);

  function openCreate() {
    setEditing(null);
    setForm({ nombre: '', organizacionId: orgs[0]?.id ?? '' });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(d: Departamento) {
    setEditing(d);
    setForm({ nombre: d.nombre, organizacionId: d.organizacionId });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await departamentoApi.update(editing.id, form);
      } else {
        await departamentoApi.create(form);
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      setFormError(extractErrorMessage(err, 'Error al guardar'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await departamentoApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Error al eliminar'));
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
        title="Departamentos"
        subtitle="Unidades organizativas de la empresa"
        action={canWrite ? { label: 'Nuevo departamento', onClick: openCreate } : undefined}
        canAction={canWrite}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-3 underline">Cerrar</button>
        </div>
      )}

      {/* Filtro por organización */}
      {orgs.length > 1 && (
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Organización:</label>
          <select
            className="input w-auto"
            value={filterOrg}
            onChange={e => setFilterOrg(e.target.value)}
          >
            <option value="">Todas</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Sin departamentos registrados"
          description="Crea el primer departamento para organizar los cargos y empleados"
          action={canWrite ? { label: 'Crear departamento', onClick: openCreate } : undefined}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Nombre', 'Organización', 'Cargos', 'Empleados', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                        <FolderOpen className="h-4 w-4 text-indigo-500" />
                      </div>
                      <span className="font-medium text-gray-900">{d.nombre}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{d.organizacion.nombre}</td>
                  <td className="px-5 py-4">
                    <span className="badge bg-blue-50 text-blue-700">{d._count.cargos} cargos</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="badge bg-green-50 text-green-700">{d._count.empleados} empl.</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      {canWrite && (
                        <button
                          onClick={() => openEdit(d)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteTarget(d)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Eliminar"
                          disabled={d._count.empleados > 0 || d._count.cargos > 0}
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

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar departamento' : 'Nuevo departamento'}
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Recursos Humanos"
            />
          </div>
          <div>
            <label className="label">Organización *</label>
            <select
              className="input"
              value={form.organizacionId}
              onChange={e => setForm(f => ({ ...f, organizacionId: e.target.value }))}
            >
              <option value="">Selecciona una organización</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.nombre || !form.organizacionId}
            className="btn-primary"
          >
            {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear departamento'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Eliminar departamento"
        message={`¿Seguro que deseas eliminar el departamento "${deleteTarget?.nombre}"?`}
      />
    </div>
  );
}
