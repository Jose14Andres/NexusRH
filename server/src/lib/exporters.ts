import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// ─────────────────────────────────────────────────────────
// Generadores de archivos para el módulo de Exportación.
// Reciben un "dataset" tabular agnóstico y producen Buffers
// en CSV, XLSX o PDF, listos para enviar como descarga.
// ─────────────────────────────────────────────────────────

export type Formato = 'csv' | 'xlsx' | 'pdf';

export type ColumnFormat = 'text' | 'number' | 'currency' | 'date';

export interface ExportColumn {
  /** Clave de la propiedad en cada fila */
  key: string;
  /** Encabezado visible */
  header: string;
  /** Ancho relativo de columna (caracteres aprox.) */
  width?: number;
  /** Formato de presentación del valor */
  format?: ColumnFormat;
}

export interface ExportDataset {
  /** Título del reporte (hoja / encabezado del PDF) */
  title: string;
  /** Subtítulo opcional (filtros aplicados, período, etc.) */
  subtitle?: string;
  columns: ExportColumn[];
  rows: Array<Record<string, unknown>>;
}

const currencyFmt = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat('es-EC', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Convierte un valor crudo a texto según su formato (CSV / PDF). */
function formatValue(value: unknown, format: ColumnFormat = 'text'): string {
  if (value === null || value === undefined) return '';
  switch (format) {
    case 'currency':
      return currencyFmt.format(Number(value));
    case 'number':
      return numberFmt.format(Number(value));
    case 'date': {
      const d = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('es-EC');
    }
    default:
      return String(value);
  }
}

// ─── CSV ──────────────────────────────────────────────────

/** Escapa un campo según RFC 4180 (comillas dobles, comas, saltos de línea). */
function csvEscape(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function buildCsv(dataset: ExportDataset): Buffer {
  const lines: string[] = [];
  lines.push(dataset.columns.map(c => csvEscape(c.header)).join(','));
  for (const row of dataset.rows) {
    lines.push(
      dataset.columns
        .map(c => csvEscape(formatValue(row[c.key], c.format)))
        .join(','),
    );
  }
  // BOM UTF-8 para que Excel reconozca acentos correctamente
  return Buffer.from('﻿' + lines.join('\r\n'), 'utf-8');
}

// ─── XLSX ─────────────────────────────────────────────────

export async function buildXlsx(dataset: ExportDataset): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NexusRH';
  wb.created = new Date();

  // Nombre de hoja: máx 31 chars y sin caracteres inválidos de Excel
  const sheetName = dataset.title.replace(/[*?:/\\[\]]/g, '').slice(0, 31) || 'Reporte';
  const ws = wb.addWorksheet(sheetName);

  ws.columns = dataset.columns.map(c => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 18,
  }));

  // Encabezado en negrita con fondo
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  };
  headerRow.alignment = { vertical: 'middle' };

  for (const row of dataset.rows) {
    const values: Record<string, unknown> = {};
    for (const c of dataset.columns) {
      const raw = row[c.key];
      if (c.format === 'currency' || c.format === 'number') {
        values[c.key] = raw === null || raw === undefined ? null : Number(raw);
      } else if (c.format === 'date') {
        const d = raw instanceof Date ? raw : raw ? new Date(String(raw)) : null;
        values[c.key] = d && !Number.isNaN(d.getTime()) ? d : null;
      } else {
        values[c.key] = raw ?? '';
      }
    }
    ws.addRow(values);
  }

  // Formatos numéricos por columna
  dataset.columns.forEach((c, idx) => {
    const col = ws.getColumn(idx + 1);
    if (c.format === 'currency') col.numFmt = '"$"#,##0.00';
    else if (c.format === 'number') col.numFmt = '#,##0.##';
    else if (c.format === 'date') col.numFmt = 'dd/mm/yyyy';
  });

  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─── PDF ──────────────────────────────────────────────────

export function buildPdf(dataset: ExportDataset): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const usableWidth = right - left;

    // ── Encabezado del documento ──
    doc.fontSize(16).fillColor('#1E3A8A').text(dataset.title, left, doc.page.margins.top);
    if (dataset.subtitle) {
      doc.moveDown(0.2);
      doc.fontSize(9).fillColor('#555555').text(dataset.subtitle, { width: usableWidth });
    }
    doc.moveDown(0.2);
    doc.fontSize(7).fillColor('#999999').text(
      `Generado: ${new Date().toLocaleString('es-EC')}`,
    );
    doc.moveDown(0.5);

    // ── Anchos de columna proporcionales ──
    const totalWeight = dataset.columns.reduce((s, c) => s + (c.width ?? 18), 0);
    const colWidths = dataset.columns.map(c => ((c.width ?? 18) / totalWeight) * usableWidth);

    const rowHeight = 18;
    const headerFontSize = 8;
    const bodyFontSize = 7.5;
    const cellPadding = 3;

    let y = doc.y;

    const drawHeader = () => {
      doc.rect(left, y, usableWidth, rowHeight).fill('#1E3A8A');
      doc.fillColor('#FFFFFF').fontSize(headerFontSize).font('Helvetica-Bold');
      let x = left;
      dataset.columns.forEach((c, i) => {
        doc.text(c.header, x + cellPadding, y + cellPadding, {
          width: colWidths[i] - cellPadding * 2,
          height: rowHeight - cellPadding,
          ellipsis: true,
          lineBreak: false,
        });
        x += colWidths[i];
      });
      y += rowHeight;
    };

    const ensureSpace = () => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }
    };

    drawHeader();

    doc.font('Helvetica').fontSize(bodyFontSize);
    dataset.rows.forEach((row, rowIdx) => {
      ensureSpace();
      if (rowIdx % 2 === 1) {
        doc.rect(left, y, usableWidth, rowHeight).fill('#F1F5F9');
      }
      doc.fillColor('#111111');
      let x = left;
      dataset.columns.forEach((c, i) => {
        const text = formatValue(row[c.key], c.format);
        const align = c.format === 'currency' || c.format === 'number' ? 'right' : 'left';
        doc.text(text, x + cellPadding, y + cellPadding, {
          width: colWidths[i] - cellPadding * 2,
          height: rowHeight - cellPadding,
          ellipsis: true,
          lineBreak: false,
          align,
        });
        x += colWidths[i];
      });
      y += rowHeight;
    });

    if (dataset.rows.length === 0) {
      doc.fillColor('#999999').fontSize(9).text('Sin registros para los filtros seleccionados.', left, y + 6);
    }

    doc.end();
  });
}

// ─── Dispatcher ───────────────────────────────────────────

export interface ExportFile {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

const CONTENT_TYPES: Record<Formato, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

export async function buildExport(formato: Formato, dataset: ExportDataset): Promise<ExportFile> {
  let buffer: Buffer;
  switch (formato) {
    case 'csv':
      buffer = buildCsv(dataset);
      break;
    case 'xlsx':
      buffer = await buildXlsx(dataset);
      break;
    case 'pdf':
      buffer = await buildPdf(dataset);
      break;
  }
  return { buffer, contentType: CONTENT_TYPES[formato], extension: formato };
}
