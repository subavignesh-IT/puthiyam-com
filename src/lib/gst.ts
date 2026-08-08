export interface GstSettings {
  gstin: string | null;
  default_rate: number;
  prices_include_gst: boolean;
  legal_name?: string | null;
  place_of_supply?: string | null;
}

export interface GstBreakup {
  rate: number;
  taxableValue: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  total: number;
}

/**
 * Splits an amount into taxable value and GST.
 * When prices already include GST the tax is extracted from the amount,
 * otherwise it is added on top.
 */
export const gstBreakup = (amount: number, rate: number, inclusive: boolean): GstBreakup => {
  const amt = Number(amount) || 0;
  const r = Number(rate) || 0;
  if (r <= 0) {
    return { rate: 0, taxableValue: amt, gstAmount: 0, cgst: 0, sgst: 0, total: amt };
  }
  const taxableValue = inclusive ? amt / (1 + r / 100) : amt;
  const gstAmount = inclusive ? amt - taxableValue : amt * (r / 100);
  return {
    rate: r,
    taxableValue: round2(taxableValue),
    gstAmount: round2(gstAmount),
    cgst: round2(gstAmount / 2),
    sgst: round2(gstAmount / 2),
    total: round2(taxableValue + gstAmount),
  };
};

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const GST_RATES = [0, 5, 12, 18, 28];

export const isValidGstin = (v: string) =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test((v || '').trim().toUpperCase());

export const inr = (n: number) => `₹${round2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;