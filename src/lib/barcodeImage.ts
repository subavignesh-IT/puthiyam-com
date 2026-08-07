import JsBarcode from 'jsbarcode';

const DPI = 300;
export const LABEL_W_IN = 2.5;
export const LABEL_H_IN = 1;

/** Renders a Code128 barcode as a PNG data URL. */
export const barcodeDataUrl = (code: string, opts?: { width?: number; height?: number; displayValue?: boolean }): string => {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, code, {
      format: 'CODE128',
      width: opts?.width ?? 2,
      height: opts?.height ?? 70,
      displayValue: opts?.displayValue ?? true,
      fontSize: 16,
      textMargin: 2,
      margin: 4,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
};

/** Async version that composes the full sticker with the barcode drawn in. */
export const labelDataUrlAsync = (code: string, name: string, price?: number): Promise<string> =>
  new Promise((resolve) => {
    const w = Math.round(LABEL_W_IN * DPI);
    const h = Math.round(LABEL_H_IN * DPI);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(''); return; }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 34px Arial';
    const title = name.length > 26 ? `${name.slice(0, 25)}…` : name;
    ctx.fillText(title, 14, 12);
    if (typeof price === 'number' && price > 0) {
      ctx.font = 'bold 30px Arial';
      const label = `Rs.${price}`;
      ctx.fillText(label, w - ctx.measureText(label).width - 14, 14);
    }

    const url = barcodeDataUrl(code, { width: 3, height: 140, displayValue: true });
    if (!url) { resolve(canvas.toDataURL('image/png')); return; }
    const img = new Image();
    img.onload = () => {
      const maxW = w - 28;
      const maxH = h - 62;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, 56, dw, dh);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(canvas.toDataURL('image/png'));
    img.src = url;
  });

/** Opens a print window sized for 1 x 2.5 inch stickers. */
export const printLabels = (labels: { dataUrl: string; code: string }[]) => {
  if (!labels.length) return;
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  const imgs = labels
    .map(l => `<img class="lbl" src="${l.dataUrl}" alt="${l.code}" />`)
    .join('');
  win.document.write(`<!doctype html><html><head><title>Barcode labels</title>
  <style>
    @page { size: auto; margin: 6mm; }
    body { margin: 0; font-family: Arial, sans-serif; display: flex; flex-wrap: wrap; gap: 4mm; }
    .lbl { width: ${LABEL_W_IN}in; height: ${LABEL_H_IN}in; object-fit: contain; border: 1px dashed #bbb; }
    @media print { .lbl { border: none; } }
  </style></head><body>${imgs}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };<\/script>
  </body></html>`);
  win.document.close();
};
