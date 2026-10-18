import api from './axios';

// ─────────────────────────────────────────────────────────
// Cliente de exportación: solicita el archivo como blob y
// dispara la descarga en el navegador. El backend define el
// nombre del archivo vía Content-Disposition.
// ─────────────────────────────────────────────────────────

export type Formato = 'csv' | 'xlsx' | 'pdf';

export type ExportEntidad = 'empleados' | 'horas' | 'nomina';

/** Extrae el filename de la cabecera Content-Disposition, con fallback. */
function parseFilename(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/** Fuerza la descarga de un blob creando un <a> temporal. */
function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Descarga un reporte de la entidad indicada en el formato dado,
 * aplicando los filtros actuales de la página.
 */
export async function downloadExport(
  entidad: ExportEntidad,
  formato: Formato,
  filtros: Record<string, string | number | undefined> = {},
): Promise<void> {
  const params: Record<string, string | number> = { formato };
  for (const [k, v] of Object.entries(filtros)) {
    if (v !== undefined && v !== '') params[k] = v;
  }

  const res = await api.get(`/exportacion/${entidad}`, {
    params,
    responseType: 'blob',
  });

  const filename = parseFilename(
    res.headers['content-disposition'],
    `${entidad}.${formato}`,
  );
  triggerDownload(res.data as Blob, filename);
}
