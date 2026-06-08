import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { horasApi, RegistroHoras } from '../api/horas';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

function extractError(err: unknown): string {
  return (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error inesperado';
}

export default function HorasAprobacionPage() {
  const [registros, setRegistros] = useState<RegistroHoras[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Rechazo con motivo
  const [rechazarTarget, setRechazarTarget] = useState<RegistroHoras | null>(null);
  const [motivo, setMotivo]                 = useState('');
  const [procesando, setProcesando]         = useState(false);
  const [actionError, setActionError]       = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRegistros(await horasApi.pendientes());
    } catch {
      setError('Error al cargar registros pendientes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAprobar(id: string) {
    setProcesando(true);
    setError('');
    try {
      await horasApi.aprobar(id);
      setRegistros(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(extractError(err));
    } finally {
      setProcesando(false);
    }
  }

  async function handleRechazar() {
    if (!rechazarTarget || !motivo.trim()) return;
    setProcesando(true);
    setActionError('');
    try {
      await horasApi.rechazar(rechazarTarget.id, motivo.trim());
      setRegistros(prev => prev.filter(r => r.id !== rechazarTarget.id));
      setRechazarTarget(null);
      setMotivo('');
    } catch (err) {
      setActionError(extractError(err));
    } finally {
      setProcesando(false);
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
        title="Aprobación de Horas"
        subtitle={`${registros.length} registro(s) pendiente(s) de revisión`}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-3 underline">Cerrar</button>
        </div>
      )}

      {registros.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Sin registros pendientes"
          description="No hay horas pendientes de aprobación en tu departamento"
        />
      ) : (
        <div className="space-y-3">
          {registros.map(r => (
            <div key={r.id} className="card flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 uppercase">
                    {r.empleado.nombres.charAt(0)}{r.empleado.apellidos.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {r.empleado.apellidos}, {r.empleado.nombres}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.empleado.cargo.nombre} · {r.empleado.departamento.nombre}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Fecha</span>
                    <p className="font-medium text-gray-800">
                      {new Date(r.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">H. Normales</span>
                    <p className="font-mono font-medium text-gray-800">{r.horasNormales.toFixed(1)} h</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">H. Extras</span>
                    <p className={`font-mono font-medium ${r.horasExtras > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {r.horasExtras.toFixed(1)} h
                    </p>
                  </div>
                  {r.observacion && (
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Obs.</span>
                      <p className="text-gray-600 truncate text-xs">{r.observacion}</p>
                    </div>
                  )}
                </div>

                {r.horasExtras > 4 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {r.horasExtras} horas extras — revisar antes de aprobar
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => handleAprobar(r.id)}
                  disabled={procesando}
                  className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-40 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Aprobar
                </button>
                <button
                  onClick={() => { setRechazarTarget(r); setMotivo(''); setActionError(''); }}
                  disabled={procesando}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal rechazo */}
      <Modal
        isOpen={!!rechazarTarget}
        onClose={() => setRechazarTarget(null)}
        title="Rechazar registro de horas"
      >
        {actionError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </div>
        )}
        {rechazarTarget && (
          <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <p><span className="font-medium">{rechazarTarget.empleado.apellidos}, {rechazarTarget.empleado.nombres}</span></p>
            <p>Fecha: {new Date(rechazarTarget.fecha).toLocaleDateString('es-EC')}</p>
            <p>Horas extras: {rechazarTarget.horasExtras.toFixed(1)} h</p>
          </div>
        )}
        <div>
          <label className="label">Motivo del rechazo *</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Explica el motivo al empleado…"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setRechazarTarget(null)} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleRechazar}
            disabled={procesando || !motivo.trim()}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            {procesando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {procesando ? 'Procesando…' : 'Confirmar rechazo'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
