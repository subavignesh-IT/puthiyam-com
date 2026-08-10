import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

export interface CourierParty {
  name: string;
  phone: string;
  address: string;
}

export interface CourierLabelData {
  from: CourierParty;
  to: CourierParty;
  orderNumber?: string;
  notes?: string;
}

export const DEFAULT_SENDER: CourierParty = {
  name: 'PUTHIYAM',
  phone: '9361284773',
  address: 'Paramakudi, Ramanathapuram - 623707',
};

/** Asks the AI helper to tidy the address into clean postal lines; falls back to the raw text. */
export const formatAddressWithAi = async (address: string, name: string, phone: string): Promise<string[]> => {
  const fallback = () =>
    address
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
  if (!address.trim()) return [];
  try {
    const { data, error } = await supabase.functions.invoke('courier-label', {
      body: { address, name, phone },
    });
    if (error) throw error;
    const lines = (data as any)?.lines;
    if (Array.isArray(lines) && lines.length) return lines.map((l: unknown) => String(l));
  } catch (e) {
    console.warn('courier-label AI formatting unavailable', e);
  }
  return fallback();
};

/** A6 = one quarter of an A4 sheet. */
const A6 = { w: 105, h: 148 };

/** Builds a quarter-A4 (A6) courier sticker as a jsPDF document. */
export const courierLabelPdf = (data: CourierLabelData, toLines?: string[]): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: [A6.w, A6.h], compress: true });
  const M = 7;
  let y = M + 4;

  doc.setDrawColor(20);
  doc.setLineWidth(0.6);
  doc.rect(3, 3, A6.w - 6, A6.h - 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('COURIER LABEL', A6.w / 2, y, { align: 'center' });
  y += 4;
  if (data.orderNumber) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Order: ${data.orderNumber}`, A6.w / 2, y, { align: 'center' });
    y += 4;
  }
  doc.setLineWidth(0.3);
  doc.line(M, y, A6.w - M, y);
  y += 7;

  const block = (title: string, party: CourierParty, lines: string[]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, M, y);
    y += 5;
    doc.setFontSize(11);
    doc.text(party.name || '-', M, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (party.phone) { doc.text(`Ph: ${party.phone}`, M, y); y += 5; }
    const wrapped = lines.length ? lines : doc.splitTextToSize(party.address || '-', A6.w - M * 2);
    for (const line of wrapped) {
      const parts = doc.splitTextToSize(line, A6.w - M * 2) as string[];
      for (const p of parts) { doc.text(p, M, y); y += 4.6; }
    }
    y += 4;
  };

  block('FROM', data.from, doc.splitTextToSize(data.from.address, A6.w - M * 2) as string[]);
  doc.setLineWidth(0.3);
  doc.line(M, y - 2, A6.w - M, y - 2);
  y += 4;
  block('TO', data.to, toLines || []);

  if (data.notes) {
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(data.notes, A6.w - M * 2) as string[], M, y);
  }

  doc.setFontSize(8);
  doc.text('Handle with care — Thank you for shopping with PUTHIYAM', A6.w / 2, A6.h - 6, { align: 'center' });
  return doc;
};

/** Formats the address with AI, then downloads the quarter-A4 sticker. */
export const downloadCourierLabel = async (data: CourierLabelData) => {
  const lines = await formatAddressWithAi(data.to.address, data.to.name, data.to.phone);
  const doc = courierLabelPdf(data, lines);
  doc.save(`Courier_${data.orderNumber || data.to.name || 'label'}.pdf`.replace(/\s+/g, '_'));
};
