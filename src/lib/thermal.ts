export interface ThermalLine {
  name: string;
  quantity: number;
  unit?: string;
  price: number;
}

export interface ThermalReceipt {
  shopName?: string;
  gstin?: string | null;
  invoiceNo: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: ThermalLine[];
  subtotal: number;
  shippingCost?: number;
  gstAmount?: number | null;
  gstRate?: number | null;
  total: number;
  received?: number;
  paymentMode: string;
  ratingUrl?: string | null;
  contactPhone?: string;
  widthMm?: 58 | 80;
}

const money = (n: number) => `Rs.${Number(n || 0).toFixed(2)}`;
const esc = (s: string) => (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

/** Builds the receipt HTML sized for a 58mm/80mm thermal roll. */
export const thermalReceiptHtml = (r: ThermalReceipt): string => {
  const width = r.widthMm ?? 80;
  const printable = width === 58 ? 48 : 72;
  const rows = r.items.map((it, i) => `
    <tr><td colspan="3" class="nm">${i + 1}. ${esc(it.name)}</td></tr>
    <tr>
      <td class="q">${it.quantity} ${esc(it.unit || 'pcs')}</td>
      <td class="p">x ${money(it.price)}</td>
      <td class="a">${money(it.price * it.quantity)}</td>
    </tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8" /><title>Receipt ${esc(r.invoiceNo)}</title>
  <style>
    @page { size: ${width}mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { width: ${printable}mm; padding: 2mm; font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.35; }
    .c { text-align: center; }
    .b { font-weight: 700; }
    .big { font-size: 15px; font-weight: 700; }
    hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 0; }
    .nm { font-weight: 700; }
    .q { width: 34%; }
    .p { width: 33%; text-align: right; }
    .a { width: 33%; text-align: right; }
    .tot { display: flex; justify-content: space-between; }
    .grand { font-size: 14px; font-weight: 700; }
    .small { font-size: 9px; word-break: break-all; }
  </style></head><body>
    <div class="c big">${esc(r.shopName || 'PUTHIYAM PRODUCTS')}</div>
    ${r.gstin ? `<div class="c small">GSTIN: ${esc(r.gstin)}</div>` : ''}
    ${r.contactPhone ? `<div class="c small">Ph: ${esc(r.contactPhone)}</div>` : ''}
    <hr />
    <div class="tot"><span>Bill</span><span class="b">${esc(r.invoiceNo)}</span></div>
    <div class="tot"><span>Date</span><span>${esc(r.date)}</span></div>
    ${r.customerName ? `<div class="tot"><span>Customer</span><span>${esc(r.customerName)}</span></div>` : ''}
    ${r.customerPhone ? `<div class="tot"><span>Phone</span><span>${esc(r.customerPhone)}</span></div>` : ''}
    <hr />
    <table>${rows}</table>
    <hr />
    <div class="tot"><span>Sub Total</span><span>${money(r.subtotal)}</span></div>
    ${r.shippingCost ? `<div class="tot"><span>Delivery</span><span>${money(r.shippingCost)}</span></div>` : ''}
    ${r.gstAmount ? `<div class="tot"><span>GST${r.gstRate ? ` @ ${r.gstRate}%` : ''}</span><span>${money(r.gstAmount)}</span></div>` : ''}
    <div class="tot grand"><span>TOTAL</span><span>${money(r.total)}</span></div>
    <div class="tot"><span>Received</span><span>${money(r.received || 0)}</span></div>
    <div class="tot"><span>Balance</span><span>${money(Math.max(0, r.total - (r.received || 0)))}</span></div>
    <div class="tot"><span>Mode</span><span>${esc(r.paymentMode)}</span></div>
    <hr />
    ${r.ratingUrl ? `<div class="c small">Rate your order:<br/>${esc(r.ratingUrl)}</div><hr />` : ''}
    <div class="c">Thank you, visit again!</div>
    <br />
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>
  </body></html>`;
};

/** Prints the receipt through the browser print dialog (any installed thermal printer). */
export const printThermalReceipt = (r: ThermalReceipt) => {
  const win = window.open('', '_blank', 'width=420,height=760');
  if (!win) return false;
  win.document.write(thermalReceiptHtml(r));
  win.document.close();
  return true;
};

/* ---------- Direct Bluetooth ESC/POS ---------- */

export const bluetoothPrintingSupported = () =>
  typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;

const ESC = '\x1B';
const GS = '\x1D';

const padLine = (left: string, right: string, cols: number) => {
  const l = left.slice(0, Math.max(0, cols - right.length - 1));
  return l + ' '.repeat(Math.max(1, cols - l.length - right.length)) + right + '\n';
};

const escposPayload = (r: ThermalReceipt): Uint8Array => {
  const cols = (r.widthMm ?? 80) === 58 ? 32 : 48;
  let s = `${ESC}@`;
  s += `${ESC}a\x01${ESC}!\x30${r.shopName || 'PUTHIYAM PRODUCTS'}\n${ESC}!\x00`;
  if (r.gstin) s += `GSTIN: ${r.gstin}\n`;
  if (r.contactPhone) s += `Ph: ${r.contactPhone}\n`;
  s += `${ESC}a\x00${'-'.repeat(cols)}\n`;
  s += padLine('Bill', r.invoiceNo, cols);
  s += padLine('Date', r.date, cols);
  if (r.customerName) s += padLine('Customer', r.customerName, cols);
  if (r.customerPhone) s += padLine('Phone', r.customerPhone, cols);
  s += `${'-'.repeat(cols)}\n`;
  r.items.forEach((it, i) => {
    s += `${i + 1}. ${it.name}\n`;
    s += padLine(`  ${it.quantity} ${it.unit || 'pcs'} x ${it.price.toFixed(2)}`, (it.price * it.quantity).toFixed(2), cols);
  });
  s += `${'-'.repeat(cols)}\n`;
  s += padLine('Sub Total', r.subtotal.toFixed(2), cols);
  if (r.shippingCost) s += padLine('Delivery', r.shippingCost.toFixed(2), cols);
  if (r.gstAmount) s += padLine(`GST${r.gstRate ? ` @ ${r.gstRate}%` : ''}`, r.gstAmount.toFixed(2), cols);
  s += `${ESC}!\x08`;
  s += padLine('TOTAL', r.total.toFixed(2), cols);
  s += `${ESC}!\x00`;
  s += padLine('Received', (r.received || 0).toFixed(2), cols);
  s += padLine('Balance', Math.max(0, r.total - (r.received || 0)).toFixed(2), cols);
  s += padLine('Mode', r.paymentMode, cols);
  s += `${'-'.repeat(cols)}\n`;
  if (r.ratingUrl) s += `${ESC}a\x01Rate your order:\n${r.ratingUrl}\n`;
  s += `${ESC}a\x01Thank you, visit again!\n\n\n`;
  s += `${GS}V\x00`;
  return new TextEncoder().encode(s);
};

/** Sends the receipt straight to a Bluetooth ESC/POS printer (Chrome + Web Bluetooth). */
export const printThermalBluetooth = async (r: ThermalReceipt): Promise<void> => {
  const bt = (navigator as any).bluetooth;
  if (!bt) throw new Error('Bluetooth printing is not supported on this device or browser.');
  const SERVICES = ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb'];
  const device = await bt.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
  const server = await device.gatt.connect();
  let characteristic: any = null;
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    const writable = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
    if (writable) { characteristic = writable; break; }
  }
  if (!characteristic) {
    server.disconnect();
    throw new Error('No writable characteristic found on this printer.');
  }
  const data = escposPayload(r);
  const chunk = 180;
  for (let i = 0; i < data.length; i += chunk) {
    const slice = data.slice(i, i + chunk);
    if (characteristic.writeValueWithoutResponse) await characteristic.writeValueWithoutResponse(slice);
    else await characteristic.writeValue(slice);
    await new Promise(res => setTimeout(res, 24));
  }
  server.disconnect();
};