import { useEffect, useState } from 'react';
import { Building2, Pencil, Trash2, Globe, Lock } from 'lucide-react';
import { organizacionApi, Organizacion, CreateOrganizacionDto } from '../api/organizacion';
import { useAuth } from '../features/auth/AuthContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const TIPO_BADGE = {
  PUBLICA:  { label: 'Pública',  icon: Globe, color: 'bg-blue-100 text-blue-700'  },
  PRIVADA:  { label: 'Privada',  icon: Lock,  color: 'bg-gray-100 text-gray-700'  },
};

const emptyForm: CreateOrganizacionDto = { nombre: '', tipo: 'PRIVADA', ruc: '', direccion: '' };

export default function OrganizacionPage() {
  const { hasPermission } = useAuth();
  const canWrite  = hasPermission('organizacion:write');

  const [items, setItems]         = useState<Organizacion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Organizacion | null>(null);
  const [form, setForm]           = useState<CreateOrganizacionDto>(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Organizacion | null>(null);
  const [deleting, setDeleting]         = useState(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await organizacionApi.list());
    } catch {
      setError('Error al cargar organizaciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(org: Organizacion) {
    setEditing(org);
    setForm({ nombre: org.nombre, tipo: org.tipo, ruc: org.ruc, direccion: org.direccion ?? '' });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await organizacionApi.update(editing.id, form);
      } else {
        await organizacionApi.create(form);
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
      await organizacionApi.remove(deleteTarget.id);
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
        title="Organización"
        subtitle="Datos de la empresa u organización"
        action={canWrite ? { label: 'Nueva organización', onClick: openCreate } : undefined}
        canAction={canWrite}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-3 underline">Cerrar</button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sin organización registrada"
          description="Agrega la organización para comenzar a estructurar departamentos y cargos"
          action={canWrite ? { label: 'Crear organización', onClick: openCreate } : undefined}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Nombre', 'Tipo', 'RUC', 'Dirección', 'Departamentos', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map(org => {
                const b = TIPO_BADGE[org.tipo];
                const BIcon = b.icon;
                return (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                          <Building2 className="h-4 w-4 text-primary-600" />
                        </div>
                        <span className="font-medium text-gray-900">{org.nombre}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge gap-1 ${b.color}`}>
                        <BIcon className="h-3 w-3" />
                        {b.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 font-mono">{org.ruc}</td>
                    <td className="px-5 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {org.direccion ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                        {org._count.departamentos} dept.
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {canWrite && (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(org)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(org)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar organización' : 'Nueva organización'}
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
              placeholder="Ej: Empresa Demo S.A."
            />
          </div>
          <div>
            <label className="label">Tipo *</label>
            <select
              className="input"
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value as 'PUBLICA' | 'PRIVADA' }))}
            >
              <option value="PRIVADA">Privada</option>
              <option value="PUBLICA">Pública</option>
            </select>
          </div>
          <div>
            <label className="label">RUC *</label>
            <input
              className="input"
              value={form.ruc}
              onChange={e => setForm(f => ({ ...f, ruc: e.target.value }))}
              placeholder="Ej: 1790012345001"
              maxLength={13}
            />
          </div>
          <div>
            <label className="label">Dirección</label>
            <input
              className="input"
              value={form.direccion ?? ''}
              onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))}
              placeholder="Ej: Av. Amazonas N37-29, Quito"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.nombre || !form.ruc}
            className="btn-primary"
          >
            {saving
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : null
            }
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear organización'}
          </button>
        </div>
      </Modal>

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Eliminar organización"
        message={`¿Seguro que deseas eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
