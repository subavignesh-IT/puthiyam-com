import * as XLSX from 'xlsx';

export interface ImportRow {
  name: string;
  category: string;
  description?: string;
  measurement_unit?: string;
  packing_type?: string;
  variant_quantity?: number;
  price?: number;
  wholesale_price?: number;
  purchase_price?: number;
  stock_quantity?: number;
  gst_rate?: number;
  hsn_code?: string;
  barcode?: string;
  delivery_charge?: number;
  batch_no?: string;
  mfd_date?: string;
  exp_date?: string;
  batch_quantity?: number;
}

export const IMPORT_COLUMNS: (keyof ImportRow)[] = [
  'name', 'category', 'description', 'measurement_unit', 'packing_type',
  'variant_quantity', 'price', 'wholesale_price', 'purchase_price', 'stock_quantity',
  'gst_rate', 'hsn_code', 'barcode', 'delivery_charge',
  'batch_no', 'mfd_date', 'exp_date', 'batch_quantity',
];

const EXAMPLE_ROWS: ImportRow[] = [
  {
    name: 'Cold Pressed Groundnut Oil', category: 'Oils', description: 'Wood pressed, chemical free',
    measurement_unit: 'ml', packing_type: 'Bottle', variant_quantity: 500, price: 260,
    wholesale_price: 240, purchase_price: 200, stock_quantity: 40, gst_rate: 5, hsn_code: '1508',
    barcode: 'PUTGRO500', delivery_charge: 0,
    batch_no: 'B-2601', mfd_date: '2026-01-05', exp_date: '2026-07-05', batch_quantity: 40,
  },
  {
    name: 'Cold Pressed Groundnut Oil', category: 'Oils', description: 'Wood pressed, chemical free',
    measurement_unit: 'ml', packing_type: 'Bottle', variant_quantity: 1000, price: 500,
    wholesale_price: 470, purchase_price: 390, stock_quantity: 25, gst_rate: 5, hsn_code: '1508',
    barcode: 'PUTGRO1000', delivery_charge: 0,
    batch_no: 'B-2602', mfd_date: '2026-01-05', exp_date: '2026-07-05', batch_quantity: 25,
  },
];

/** Downloads a ready-to-fill example workbook with the exact expected columns. */
export const downloadExampleWorkbook = () => {
  const sheet = XLSX.utils.json_to_sheet(EXAMPLE_ROWS, { header: IMPORT_COLUMNS as string[] });
  sheet['!cols'] = IMPORT_COLUMNS.map(c => ({ wch: Math.max(14, String(c).length + 4) }));
  const notes = XLSX.utils.aoa_to_sheet([
    ['How to fill this sheet'],
    ['1. One row per product variant. Repeat the product name to add more variants to the same product.'],
    ['2. name and category are required. Everything else is optional.'],
    ['3. variant_quantity is the pack size number (e.g. 500 for 500 ml).'],
    ['4. Dates use YYYY-MM-DD. Leave batch columns empty if you do not track batches.'],
    ['5. Delete the sample rows in the "products" sheet before importing your own data.'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'products');
  XLSX.utils.book_append_sheet(wb, notes, 'instructions');
  XLSX.writeFile(wb, 'PUTHIYAM_product_import_example.xlsx');
};

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const dateStr = (v: unknown): string | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
};

export interface ParseResult {
  rows: ImportRow[];
  errors: string[];
}

/** Reads the first sheet of an xlsx/csv file into validated import rows. */
export const parseProductWorkbook = async (file: File): Promise<ParseResult> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'products') || wb.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: '' });
  const rows: ImportRow[] = [];
  const errors: string[] = [];

  raw.forEach((r, i) => {
    const line = i + 2;
    const get = (k: string) => r[k] ?? r[k.toUpperCase()] ?? r[k.replace(/_/g, ' ')] ?? '';
    const name = String(get('name') || '').trim();
    const category = String(get('category') || '').trim();
    if (!name) { errors.push(`Row ${line}: missing product name — skipped`); return; }
    if (!category) { errors.push(`Row ${line}: missing category — skipped`); return; }
    const price = num(get('price'));
    if (price === undefined || price <= 0) errors.push(`Row ${line}: price missing or zero — imported with price 0`);
    rows.push({
      name,
      category,
      description: String(get('description') || '').trim() || undefined,
      measurement_unit: String(get('measurement_unit') || '').trim() || 'pcs',
      packing_type: String(get('packing_type') || '').trim() || undefined,
      variant_quantity: num(get('variant_quantity')) ?? 1,
      price: price ?? 0,
      wholesale_price: num(get('wholesale_price')),
      purchase_price: num(get('purchase_price')),
      stock_quantity: num(get('stock_quantity')) ?? 0,
      gst_rate: num(get('gst_rate')),
      hsn_code: String(get('hsn_code') || '').trim() || undefined,
      barcode: String(get('barcode') || '').trim() || undefined,
      delivery_charge: num(get('delivery_charge')),
      batch_no: String(get('batch_no') || '').trim() || undefined,
      mfd_date: dateStr(get('mfd_date')),
      exp_date: dateStr(get('exp_date')),
      batch_quantity: num(get('batch_quantity')),
    });
  });

  return { rows, errors };
};
