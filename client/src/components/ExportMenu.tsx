import { useEffect, useRef, useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileType, ChevronDown } from 'lucide-react';
import { downloadExport, Formato, ExportEntidad } from '../api/exportacion';

interface Props {
  entidad: ExportEntidad;
  /** Filtros actuales de la página, se reenvían al backend. */
  filtros?: Record<string, string | number | undefined>;
  /** Texto del botón principal. */
  label?: string;
  disabled?: boolean;
}

const OPCIONES: Array<{ formato: Formato; label: string; icon: React.ElementType }> = [
  { formato: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { formato: 'csv',  label: 'CSV (.csv)',    icon: FileText },
  { formato: 'pdf',  label: 'PDF (.pdf)',    icon: FileType },
];

/** Lee el mensaje de error de una respuesta blob (el backend devuelve JSON). */
async function extractBlobError(err: unknown): Promise<string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      /* cae al genérico */
    }
  }
  return 'No se pudo generar la exportación';
}

export default function ExportMenu({ entidad, filtros, label = 'Exportar', disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Formato | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function handleSelect(formato: Formato) {
    setBusy(formato);
    try {
      await downloadExport(entidad, formato, filtros);
      setOpen(false);
    } catch (err) {
      alert(await extractBlobError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={disabled || busy !== null}
        className="btn-secondary shrink-0 disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        {busy ? 'Generando…' : label}
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {OPCIONES.map(({ formato, label: optLabel, icon: Icon }) => (
            <button
              key={formato}
              type="button"
              onClick={() => handleSelect(formato)}
              disabled={busy !== null}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Icon className="h-4 w-4 text-gray-400" />
              {optLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
