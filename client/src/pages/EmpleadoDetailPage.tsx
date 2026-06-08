import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  User,
  Briefcase,
  ShieldCheck,
  Phone,
  Mail,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { empleadoApi, Empleado, Afiliacion } from '../api/empleado';
import { useAuth } from '../features/auth/AuthContext';
import Modal from '../components/Modal';

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO:   'bg-green-50 text-green-700 border-green-200',
  INACTIVO: 'bg-red-50 text-red-700 border-red-200',
  LICENCIA: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

const SEGURO_LABEL: Record<string, string> = {
  IESS:    'IESS',
  PRIVADO: 'Privado',
  NINGUNO: 'Ninguno',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value ?? <span className="text-gray-300 italic">—</span>}</span>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
        <Icon className="h-4 w-4 text-primary-600" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const emptyAfil = (): Omit<Afiliacion, 'id' | 'empleadoId' | 'createdAt' | 'updatedAt'> => ({
  asegurado: false,
  tipoSeguro: 'NINGUNO',
  numeroAfiliacion: '',
  fechaAfiliacion: '',
});

export default function EmpleadoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite      = hasPermission('empleado:write');
  const canAfil       = hasPermission('afiliacion:write');
  const canReadAfil   = hasPermission('afiliacion:read');

  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [afiliacion, setAfiliacion] = useState<Afiliacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal afiliación
  const [afilModal, setAfilModal] = useState(false);
  const [afilForm, setAfilForm] = useState(emptyAfil());
  const [afilSaving, setAfilSaving] = useState(false);
  const [afilError, setAfilError] = useState('');

  async function load() {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [emp, afil] = await Promise.all([
        empleadoApi.getOne(id),
        canReadAfil ? empleadoApi.getAfiliacion(id).catch(() => null) : Promise.resolve(null),
      ]);
      setEmpleado(emp);
      setAfiliacion(afil);
    } catch {
      setError('No se pudo cargar la ficha del empleado');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function openAfilModal() {
    setAfilForm({
      asegurado:        afiliacion?.asegurado ?? false,
      tipoSeguro:       afiliacion?.tipoSeguro ?? 'NINGUNO',
      numeroAfiliacion: afiliacion?.numeroAfiliacion ?? '',
      fechaAfiliacion:  afiliacion?.fechaAfiliacion?.slice(0, 10) ?? '',
    });
    setAfilError('');
    setAfilModal(true);
  }

  async function saveAfiliacion() {
    if (!id) return;
    setAfilSaving(true);
    setAfilError('');
    try {
      const saved = await empleadoApi.upsertAfiliacion(id, {
        asegurado:        afilForm.asegurado,
        tipoSeguro:       afilForm.tipoSeguro,
        numeroAfiliacion: afilForm.numeroAfiliacion || null,
        fechaAfiliacion:  afilForm.fechaAfiliacion || null,
      });
      setAfiliacion(saved);
      setAfilModal(false);
    } catch {
      setAfilError('Error al guardar afiliación');
    } finally {
      setAfilSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !empleado) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-red-600 text-sm">{error || 'Empleado no encontrado'}</p>
        <Link to="/empleados" className="btn-secondary text-sm">Volver a la lista</Link>
      </div>
    );
  }

  const nombreCompleto = `${empleado.apellidos}, ${empleado.nombres}`;
  const iniciales = `${empleado.nombres.charAt(0)}${empleado.apellidos.charAt(0)}`.toUpperCase();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/empleados')}
          className="mb-3 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a empleados
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
              {iniciales}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{nombreCompleto}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[empleado.estado] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}
                >
                  {empleado.estado}
                </span>
                <span className="text-sm text-gray-500">{empleado.cargo.nombre} · {empleado.departamento.nombre}</span>
              </div>
            </div>
          </div>

          {canWrite && (
            <Link
              to={`/empleados`}
              state={{ editId: empleado.id }}
              className="btn-secondary shrink-0 flex items-center gap-1.5"
              onClick={e => {
                e.preventDefault();
                navigate('/empleados', { state: { editId: empleado.id } });
              }}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Datos personales */}
        <Section icon={User} title="Datos personales">
          <InfoRow label="Cédula" value={<span className="font-mono">{empleado.cedula}</span>} />
          <InfoRow label="Nombres" value={empleado.nombres} />
          <InfoRow label="Apellidos" value={empleado.apellidos} />
          <InfoRow label="Email" value={
            <a href={`mailto:${empleado.email}`} className="text-primary-600 hover:underline flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {empleado.email}
            </a>
          } />
          <InfoRow label="Teléfono" value={
            empleado.telefono
              ? <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{empleado.telefono}</span>
              : null
          } />
        </Section>

        {/* Datos laborales */}
        <Section icon={Briefcase} title="Datos laborales">
          <InfoRow label="Cargo" value={
            <span>
              {empleado.cargo.nombre}
              <span className="ml-2 text-xs text-gray-400">${empleado.cargo.sueldoBase.toFixed(2)}/mes</span>
            </span>
          } />
          <InfoRow label="Departamento" value={empleado.departamento.nombre} />
          <InfoRow label="Fecha de ingreso" value={
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(empleado.fechaIngreso).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          } />
          {empleado.fechaSalida && (
            <InfoRow label="Fecha de salida" value={
              new Date(empleado.fechaSalida).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
            } />
          )}
          <InfoRow label="Estado" value={
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[empleado.estado] ?? ''}`}>
              {empleado.estado}
            </span>
          } />
          {empleado.usuario && (
            <InfoRow label="Usuario del sistema" value={
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{empleado.usuario.username}</span>
                {empleado.usuario.activo
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  : <XCircle className="h-3.5 w-3.5 text-gray-400" />
                }
              </span>
            } />
          )}
        </Section>

        {/* Afiliación */}
        {canReadAfil && (
          <Section icon={ShieldCheck} title="Afiliación / Seguro">
            <InfoRow label="Asegurado" value={
              afiliacion?.asegurado
                ? <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4" /> Sí</span>
                : <span className="flex items-center gap-1 text-gray-400"><XCircle className="h-4 w-4" /> No</span>
            } />
            <InfoRow label="Tipo de seguro" value={SEGURO_LABEL[afiliacion?.tipoSeguro ?? 'NINGUNO']} />
            {afiliacion?.numeroAfiliacion && (
              <InfoRow label="N.° de afiliación" value={<span className="font-mono">{afiliacion.numeroAfiliacion}</span>} />
            )}
            {afiliacion?.fechaAfiliacion && (
              <InfoRow label="Fecha de afiliación" value={
                new Date(afiliacion.fechaAfiliacion).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
              } />
            )}

            {canAfil && (
              <div className="mt-3">
                <button onClick={openAfilModal} className="btn-secondary text-xs flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  Editar afiliación
                </button>
              </div>
            )}
          </Section>
        )}
      </div>

      {/* Modal Afiliación */}
      <Modal isOpen={afilModal} onClose={() => setAfilModal(false)} title="Editar afiliación">
        {afilError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {afilError}
          </div>
        )}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              id="asegurado"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              checked={afilForm.asegurado}
              onChange={e => setAfilForm(f => ({ ...f, asegurado: e.target.checked }))}
            />
            <label htmlFor="asegurado" className="text-sm font-medium text-gray-700">Empleado asegurado</label>
          </div>

          <div>
            <label className="label">Tipo de seguro</label>
            <select
              className="input"
              value={afilForm.tipoSeguro}
              onChange={e => setAfilForm(f => ({ ...f, tipoSeguro: e.target.value as 'IESS' | 'PRIVADO' | 'NINGUNO' }))}
            >
              <option value="NINGUNO">Ninguno</option>
              <option value="IESS">IESS</option>
              <option value="PRIVADO">Privado</option>
            </select>
          </div>

          {afilForm.tipoSeguro !== 'NINGUNO' && (
            <>
              <div>
                <label className="label">Número de afiliación</label>
                <input
                  className="input font-mono"
                  placeholder="Ej. 12345678901"
                  value={afilForm.numeroAfiliacion ?? ''}
                  onChange={e => setAfilForm(f => ({ ...f, numeroAfiliacion: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Fecha de afiliación</label>
                <input
                  className="input"
                  type="date"
                  value={afilForm.fechaAfiliacion ?? ''}
                  onChange={e => setAfilForm(f => ({ ...f, fechaAfiliacion: e.target.value }))}
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setAfilModal(false)} className="btn-secondary">Cancelar</button>
          <button
            onClick={saveAfiliacion}
            disabled={afilSaving}
            className="btn-primary flex items-center gap-2"
          >
            {afilSaving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {afilSaving ? 'Guardando…' : 'Guardar afiliación'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
