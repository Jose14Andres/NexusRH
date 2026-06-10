import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, CheckCircle, Banknote,
  User, Calendar, Building2, Briefcase,
} from 'lucide-react';
import { nominaApi, Nomina, EstadoNomina } from '../api/nomina';
import { useAuth } from '../features/auth/AuthContext';

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

interface AjusteForm {
  descuentos: string;
  bonos: string;
  observaciones: string;
}

export default function NominaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite   = hasPermission('nomina:write');
  const canApprove = hasPermission('nomina:approve');

  const [nomina, setNomina]   = useState<Nomina | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Ajustes manuales
  const [editMode, setEditMode]   = useState(false);
  const [form, setForm]           = useState<AjusteForm>({ descuentos: '0', bonos: '0', observaciones: '' });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  // Pagar
  const [pagarModal, setPagarModal] = useState(false);
  const [fechaPago, setFechaPago]   = useState(new Date().toISOString().slice(0, 10));
  const [pagando, setPagando]       = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await nominaApi.getOne(id!);
      setNomina(data);
      setForm({
        descuentos:    String(data.descuentos),
        bonos:         String(data.bonos),
        observaciones: data.observaciones ?? '',
      });
    } catch {
      setError('Error al cargar la nómina');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleSave() {
    setSaving(true);
    setFormError('');
    try {
      await nominaApi.update(id!, {
        descuentos:    parseFloat(form.descuentos)    || 0,
        bonos:         parseFloat(form.bonos)         || 0,
        observaciones: form.observaciones || undefined,
      });
      setEditMode(false);
      await load();
    } catch (err) {
      setFormError(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAprobar() {
    try {
      await nominaApi.aprobar(id!);
      await load();
    } catch (err) {
      alert(extractError(err));
    }
  }

  async function handlePagar() {
    setPagando(true);
    try {
      await nominaApi.pagar(id!, fechaPago);
      setPagarModal(false);
      await load();
    } catch (err) {
      alert(extractError(err));
    } finally {
      setPagando(false);
    }
  }

  if (loading) return <div className="py-16 text-center text-sm text-gray-500">Cargando...</div>;
  if (error || !nomina) return (
    <div className="rounded-lg bg-red-50 p-6 text-sm text-red-700">
      {error || 'Nómina no encontrada'}
    </div>
  );

  const canEdit   = canWrite && ['CALCULADO', 'PENDIENTE'].includes(nomina.estado);
  const canAprove = canApprove && nomina.estado === 'CALCULADO';
  const canPay    = canApprove && nomina.estado === 'APROBADO';

  const periodoLabel = `${MESES[nomina.mes - 1]} ${nomina.anio}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/nomina')}
          className="icon-btn text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            Nómina — {nomina.empleado.apellidos}, {nomina.empleado.nombres}
          </h1>
          <p className="text-sm text-gray-500">{periodoLabel}</p>
        </div>
        <span className={`badge text-sm ${ESTADO_BADGE[nomina.estado]}`}>{nomina.estado}</span>
      </div>

      {/* Datos del empleado */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Empleado</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InfoItem icon={<User className="h-4 w-4" />}     label="Cédula"       value={nomina.empleado.cedula} />
          <InfoItem icon={<Briefcase className="h-4 w-4" />} label="Cargo"       value={nomina.empleado.cargo.nombre} />
          <InfoItem icon={<Building2 className="h-4 w-4" />} label="Departamento" value={nomina.empleado.departamento.nombre} />
          <InfoItem icon={<DollarSign className="h-4 w-4" />} label="Sueldo base" value={fmt(nomina.empleado.cargo.sueldoBase)} />
        </div>
      </div>

      {/* Desglose nómina */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Desglose — {periodoLabel}</h2>
        </div>

        {/* Ingresos */}
        <div className="px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Ingresos</p>
          <div className="space-y-2">
            <DetalleRow label="Sueldo base"        value={fmt(nomina.empleado.cargo.sueldoBase)} />
            {nomina.horasExtrasQty > 0 && (
              <DetalleRow
                label={`Horas extras (${nomina.horasExtrasQty.toFixed(1)} h)`}
                value={fmt(nomina.horasExtrasValor)}
              />
            )}
            {nomina.bonos > 0 && (
              <DetalleRow label="Bonos / otros ingresos" value={fmt(nomina.bonos)} />
            )}
            <DetalleRow label="Sueldo bruto" value={fmt(nomina.sueldoBruto)} bold />
          </div>
        </div>

        {/* Descuentos */}
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Descuentos</p>
          <div className="space-y-2">
            <DetalleRow label="Aporte personal IESS (9.45%)" value={`-${fmt(nomina.aportePersonal)}`} negative />
            {nomina.descuentos > 0 && (
              <DetalleRow label="Otros descuentos" value={`-${fmt(nomina.descuentos)}`} negative />
            )}
          </div>
        </div>

        {/* Beneficios provisionales */}
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Beneficios sociales (provisión mensual)</p>
          <div className="space-y-2">
            <DetalleRow label="Décimo tercero (8.33%)"  value={fmt(nomina.decimoTercero)} muted />
            <DetalleRow label="Décimo cuarto (SBU/12)"  value={fmt(nomina.decimoCuarto)}  muted />
            {nomina.fondosReserva > 0 && (
              <DetalleRow label="Fondos de reserva (8.33%)" value={fmt(nomina.fondosReserva)} muted />
            )}
            <DetalleRow label="Aporte patronal IESS (12.15%)" value={fmt(nomina.aportePatronal)} muted />
          </div>
        </div>

        {/* Neto */}
        <div className="border-t border-gray-200 bg-gray-50 px-5 py-4 text-right">
          <p className="text-xs text-gray-500">Neto a recibir</p>
          <p className="text-2xl font-bold text-green-700">{fmt(nomina.sueldoNeto)}</p>
        </div>
      </div>

      {/* Ajustes manuales */}
      {canEdit && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Ajustes manuales</h2>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="btn btn-secondary text-xs">
                Editar
              </button>
            )}
          </div>
          {editMode ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Descuentos adicionales ($)</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={form.descuentos}
                    onChange={e => setForm(f => ({ ...f, descuentos: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Bonos ($)</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={form.bonos}
                    onChange={e => setForm(f => ({ ...f, bonos: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">Observaciones</label>
                <textarea
                  rows={2}
                  value={form.observaciones}
                  onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                  className="input resize-none"
                />
              </div>
              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
              )}
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditMode(false)} className="btn btn-secondary" disabled={saving}>Cancelar</button>
                <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar ajustes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Descuentos adicionales: </span>
                <span className="font-medium">{fmt(nomina.descuentos)}</span>
              </div>
              <div>
                <span className="text-gray-500">Bonos: </span>
                <span className="font-medium">{fmt(nomina.bonos)}</span>
              </div>
              {nomina.observaciones && (
                <div className="col-span-2">
                  <span className="text-gray-500">Obs: </span>
                  <span>{nomina.observaciones}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fechas */}
      {nomina.fechaPago && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Fecha de pago:</span>
            <span className="font-medium text-green-700">
              {new Date(nomina.fechaPago).toLocaleDateString('es-EC')}
            </span>
          </div>
        </div>
      )}

      {/* Acciones */}
      {(canAprove || canPay) && (
        <div className="flex justify-end gap-3">
          {canAprove && (
            <button onClick={handleAprobar} className="btn btn-primary flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Aprobar nómina
            </button>
          )}
          {canPay && (
            <button onClick={() => setPagarModal(true)} className="btn btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700">
              <Banknote className="h-4 w-4" />
              Marcar como pagada
            </button>
          )}
        </div>
      )}

      {/* Modal pagar */}
      {pagarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Confirmar pago</h3>
            <div className="mb-4">
              <label className="label">Fecha de pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={e => setFechaPago(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPagarModal(false)} className="btn btn-secondary" disabled={pagando}>Cancelar</button>
              <button onClick={handlePagar} disabled={pagando} className="btn btn-primary bg-green-600 hover:bg-green-700">
                {pagando ? 'Procesando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-gray-400">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function DetalleRow({
  label, value, bold, negative, muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  negative?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between text-sm ${muted ? 'text-gray-400' : ''}`}>
      <span className={bold ? 'font-semibold text-gray-900' : ''}>{label}</span>
      <span className={`${bold ? 'font-bold text-gray-900' : ''} ${negative ? 'text-red-600' : ''}`}>
        {value}
      </span>
    </div>
  );
}
