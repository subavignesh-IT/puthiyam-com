import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';

const A4 = { w: 210, h: 297 };

/**
 * Renders a bill DOM node to a JPEG at 1080p-class quality — the pixel ratio is
 * derived so the exported image is at least 1080px wide.
 */
export const renderHdJpeg = async (node: HTMLElement, minWidth = 1080): Promise<string> => {
  const width = node.offsetWidth || node.clientWidth || 720;
  const ratio = Math.max(2, Math.ceil((minWidth / width) * 10) / 10);
  return toJpeg(node, { quality: 0.95, backgroundColor: '#ffffff', pixelRatio: ratio });
};

const imageSize = (dataUrl: string) =>
  new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1000, h: 1400 });
    img.src = dataUrl;
  });

/** Places one or more images on A4 pages, scaled to fit with margins. */
export const imagesToA4Pdf = async (dataUrls: string[], margin = 10): Promise<jsPDF> => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const maxW = A4.w - margin * 2;
  const maxH = A4.h - margin * 2;
  for (let i = 0; i < dataUrls.length; i++) {
    if (i > 0) doc.addPage();
    const { w, h } = await imageSize(dataUrls[i]);
    const scale = Math.min(maxW / w, maxH / h);
    const dw = w * scale;
    const dh = h * scale;
    doc.addImage(dataUrls[i], 'JPEG', (A4.w - dw) / 2, margin, dw, dh, undefined, 'FAST');
  }
  return doc;
};

export const downloadA4Pdf = async (dataUrl: string, filename: string) => {
  const doc = await imagesToA4Pdf([dataUrl]);
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
};

export const a4PdfFile = async (dataUrl: string, filename: string): Promise<File> => {
  const doc = await imagesToA4Pdf([dataUrl]);
  const blob = doc.output('blob');
  return new File([blob], filename.endsWith('.pdf') ? filename : `${filename}.pdf`, { type: 'application/pdf' });
};

/** Shares a PDF through the native share sheet; falls back to a download. */
export const sharePdf = async (dataUrl: string, filename: string, text?: string): Promise<'shared' | 'downloaded'> => {
  const file = await a4PdfFile(dataUrl, filename);
  const nav = navigator as any;
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return 'shared';
    } catch { /* user cancelled or unsupported — fall through */ }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
};

/** Opens a print window with a single image laid out on an A4 page. */
export const printImageA4 = (dataUrl: string, title = 'Invoice') => {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${title}</title><style>
    @page { size: A4; margin: 10mm; }
    html, body { margin: 0; padding: 0; background: #fff; }
    img { width: 100%; height: auto; display: block; }
  </style></head><body><img src="${dataUrl}" alt="${title}" />
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>
  </body></html>`);
  win.document.close();
};