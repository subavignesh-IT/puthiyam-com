import { supabase } from '@/integrations/supabase/client';

export interface BillDesign {
  id?: string;
  seller_id?: string;
  name: string;
  is_default: boolean;
  template: string;
  accent_color: string;
  header_color: string;
  table_header_color: string;
  totals_color: string;
  font_family: string;
  font_size: number;
  logo_url: string | null;
  business_name: string | null;
  business_phone: string | null;
  business_address: string | null;
  terms: string | null;
  footer_note: string | null;
  upi_id: string | null;
  show_upi_qr: boolean;
  show_loyalty: boolean;
  show_gstin: boolean;
  show_hsn: boolean;
  show_batch: boolean;
  show_mfd_exp: boolean;
  show_delivery: boolean;
  show_signature: boolean;
}

export const DEFAULT_BILL_DESIGN: BillDesign = {
  name: 'Classic Red',
  is_default: true,
  template: 'classic',
  accent_color: '#e8202a',
  header_color: '#232630',
  table_header_color: '#e8202a',
  totals_color: '#e8202a',
  font_family: 'Arial, Helvetica, sans-serif',
  font_size: 12,
  logo_url: null,
  business_name: 'PUTHIYAM PRODUCTS',
  business_phone: '9361284773',
  business_address: 'Paramakudi, Ramanathapuram - 623707',
  terms: 'Thank you for doing business with us.',
  footer_note: null,
  upi_id: null,
  show_upi_qr: true,
  show_loyalty: true,
  show_gstin: true,
  show_hsn: false,
  show_batch: false,
  show_mfd_exp: false,
  show_delivery: true,
  show_signature: false,
};

export const TEMPLATE_PRESETS: Record<string, Partial<BillDesign>> = {
  classic: { accent_color: '#e8202a', header_color: '#232630', table_header_color: '#e8202a', totals_color: '#e8202a' },
  midnight: { accent_color: '#6366f1', header_color: '#0f172a', table_header_color: '#312e81', totals_color: '#4338ca' },
  emerald: { accent_color: '#059669', header_color: '#064e3b', table_header_color: '#047857', totals_color: '#047857' },
  sunset: { accent_color: '#ea580c', header_color: '#7c2d12', table_header_color: '#f97316', totals_color: '#ea580c' },
  mono: { accent_color: '#111827', header_color: '#111827', table_header_color: '#374151', totals_color: '#111827' },
};

export const FONT_OPTIONS = [
  'Arial, Helvetica, sans-serif',
  'Georgia, "Times New Roman", serif',
  '"Courier New", monospace',
  'Verdana, Geneva, sans-serif',
  '"Trebuchet MS", sans-serif',
];

/** Loads the seller's default bill design, falling back to the built-in one. */
export const loadDefaultBillDesign = async (sellerId: string): Promise<BillDesign> => {
  const { data } = await supabase
    .from('bill_designs' as any)
    .select('*')
    .eq('seller_id', sellerId)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return DEFAULT_BILL_DESIGN;
  return { ...DEFAULT_BILL_DESIGN, ...(data as any) };
};
