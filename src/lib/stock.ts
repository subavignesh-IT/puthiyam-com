import { supabase } from '@/integrations/supabase/client';

export interface StockLine { variantId?: string | null; quantity: number }

/** Reduces variant stock after a successful checkout (skipped for unlimited-stock products). */
export const decrementStock = async (lines: StockLine[]) => {
  const valid = lines.filter(l => l.variantId && l.quantity > 0);
  await Promise.all(
    valid.map(l =>
      (supabase.rpc as any)('decrement_variant_stock', { _variant_id: l.variantId, _qty: l.quantity })
        .then(({ error }: any) => { if (error) console.error('stock update failed', error.message); })
    )
  );
};

export type StockState = 'unlimited' | 'out' | 'limited' | 'ok';

export const stockState = (stock: number | null | undefined, unlimited?: boolean): StockState => {
  if (unlimited) return 'unlimited';
  const s = Number(stock ?? 0);
  if (s <= 0) return 'out';
  if (s <= 5) return 'limited';
  return 'ok';
};
