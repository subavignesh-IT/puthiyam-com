import React, { forwardRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { rupeesInWords } from '@/lib/numberToWords';
import { BillDesign, DEFAULT_BILL_DESIGN } from '@/lib/billDesign';

export interface InvoiceLine {
  name: string;
  quantity: number;
  unit?: string;
  price: number;
  hsn?: string | null;
  batchNo?: string | null;
  mfd?: string | null;
  exp?: string | null;
}

export interface LoyaltyInfo {
  stamps: number;
  required: number;
  rewardAmount: number;
  points?: number | null;
}

export interface DeliveryInfo {
  fromName: string;
  fromPhone: string;
  fromAddress: string;
  toName: string;
  toPhone: string;
  toAddress: string;
}

export interface InvoiceBillProps {
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  items: InvoiceLine[];
  subtotal: number;
  shippingCost?: number;
  total: number;
  received?: number;
  paymentMode: string;
  upiId?: string;
  payeeName?: string;
  ratingUrl?: string | null;
  loyaltyPoints?: number | null;
  gstin?: string | null;
  gstRate?: number | null;
  gstAmount?: number | null;
  contactPhone?: string;
  contactEmail?: string;
  terms?: string;
  design?: BillDesign;
  loyalty?: LoyaltyInfo | null;
  delivery?: DeliveryInfo | null;
}

const MIN_ROWS = 4;

const useQr = (data?: string | null) => {
  const [src, setSrc] = useState<string>('');
  useEffect(() => {
    let alive = true;
    if (!data) { setSrc(''); return; }
    QRCode.toDataURL(data, { margin: 0, width: 320, errorCorrectionLevel: 'M' })
      .then(url => { if (alive) setSrc(url); })
      .catch(() => { if (alive) setSrc(''); });
    return () => { alive = false; };
  }, [data]);
  return src;
};

const money = (n: number) => `₹ ${Number(n || 0).toFixed(2).replace(/\.00$/, '')}`;

const InvoiceBill = forwardRef<HTMLDivElement, InvoiceBillProps>((props, ref) => {
  const {
    invoiceNo, date, customerName, customerPhone, customerAddress, items,
    subtotal, shippingCost = 0, total, received = 0, paymentMode,
    upiId, payeeName = 'PUTHIYAM PRODUCTS', ratingUrl, loyaltyPoints,
    gstin, gstRate, gstAmount,
    contactPhone = '9361284773', contactEmail = 'puthiyamproduct@gmail.com',
    terms = 'Thank you for doing business with us.',
    design: designProp, loyalty, delivery,
  } = props;

  const design = { ...DEFAULT_BILL_DESIGN, ...(designProp || {}) };
  const RED = design.table_header_color || design.accent_color;
  const ACCENT = design.accent_color;
  const DARK = design.header_color;
  const TOTALS = design.totals_color || ACCENT;
  const baseFont = design.font_size || 12;

  const upiLink = upiId && design.show_upi_qr
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill ${invoiceNo}`)}`
    : '';
  const paymentQr = useQr(upiLink);
  const ratingQr = useQr(ratingUrl || '');

  const balance = Math.max(0, total - received);
  const rows = [...items];
  while (rows.length < MIN_ROWS) rows.push(null as any);

  const cellBorder = `1px solid ${DARK}22`;
  const th: React.CSSProperties = {
    background: RED, color: '#ffffff', fontSize: baseFont, fontWeight: 700,
    padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    fontSize: baseFont, padding: '9px 10px', textAlign: 'right', borderBottom: cellBorder,
    borderRight: cellBorder, color: '#111', height: 18,
  };
  const sumLabel: React.CSSProperties = { fontSize: baseFont, padding: '6px 8px', border: cellBorder, color: '#111' };
  const sumValue: React.CSSProperties = { ...sumLabel, textAlign: 'right', whiteSpace: 'nowrap' };
  const showHsn = design.show_hsn;
  const showBatch = design.show_batch;
  const showMfdExp = design.show_mfd_exp;

  return (
    <div
      ref={ref}
      style={{
        width: 720, background: '#ffffff', fontFamily: design.font_family || 'Arial, Helvetica, sans-serif',
        color: '#111', position: 'relative', paddingBottom: 28,
      }}
    >
      {/* Top red band */}
      <div style={{
        background: RED, height: 66, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 48, color: '#fff', fontSize: baseFont,
      }}>
        <span style={{ borderRight: '1px solid #ffffff88', paddingRight: 14 }}>&#9742; {design.business_phone || contactPhone}</span>
        <span>&#9993; {contactEmail}</span>
      </div>

      {/* Company + title */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{
          background: DARK, color: '#fff', padding: '14px 26px 16px',
          borderBottomRightRadius: 44, minWidth: 380, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {design.logo_url ? (
            <img src={design.logo_url} alt="logo" style={{ width: 46, height: 46, objectFit: 'contain', background: '#fff', borderRadius: 6 }} />
          ) : null}
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 0.5 }}>
              {(design.business_name || 'PUTHIYAM_PRODUCTS').toUpperCase()}
            </div>
            {design.business_address ? (
              <div style={{ fontSize: 11, marginTop: 3, opacity: 0.9 }}>{design.business_address}</div>
            ) : null}
            {gstin && design.show_gstin ? <div style={{ fontSize: 11, marginTop: 4, opacity: 0.9 }}>GSTIN: {gstin}</div> : null}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 26px' }}>
          <div style={{ fontSize: 28, fontWeight: 400 }}>Bill of Supply</div>
        </div>
      </div>

      {/* Bill to / invoice meta */}
      <div style={{ display: 'flex', padding: '18px 26px 12px', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: ACCENT, fontSize: baseFont + 2, fontWeight: 700, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{customerName || 'Walk-in Customer'}</div>
          <div style={{ fontSize: baseFont, marginTop: 4 }}>
            <strong>Contact No.:</strong>&nbsp;&nbsp;{customerPhone || '-'}
          </div>
          {customerAddress ? (
            <div style={{ fontSize: baseFont, marginTop: 2, maxWidth: 320 }}>
              <strong>Address:</strong>&nbsp;&nbsp;{customerAddress}
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: baseFont, minWidth: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <strong>Invoice No.:</strong><span>{invoiceNo}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>Date:</strong><span>{date}</span>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div style={{ padding: '0 26px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left', width: 34 }}>#</th>
              <th style={{ ...th, textAlign: 'left' }}>Item Name</th>
              {showHsn && <th style={{ ...th, width: 74 }}>HSN</th>}
              {showBatch && <th style={{ ...th, width: 84 }}>Batch</th>}
              {showMfdExp && <th style={{ ...th, width: 120 }}>MFD / EXP</th>}
              <th style={{ ...th, width: 92 }}>Quantity</th>
              <th style={{ ...th, width: 74 }}>Unit</th>
              <th style={{ ...th, width: 96 }}>Price/ Unit</th>
              <th style={{ ...th, width: 96 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it, i) => (
              <tr key={i}>
                <td style={{ ...td, textAlign: 'left', borderLeft: cellBorder }}>{it ? i + 1 : ''}</td>
                <td style={{ ...td, textAlign: 'left', fontWeight: 700 }}>{it ? it.name : ''}</td>
                {showHsn && <td style={td}>{it ? (it.hsn || '-') : ''}</td>}
                {showBatch && <td style={td}>{it ? (it.batchNo || '-') : ''}</td>}
                {showMfdExp && <td style={td}>{it ? `${it.mfd || '-'} / ${it.exp || '-'}` : ''}</td>}
                <td style={td}>{it ? it.quantity : ''}</td>
                <td style={td}>{it ? (it.unit || 'Pcs') : ''}</td>
                <td style={td}>{it ? money(it.price) : ''}</td>
                <td style={td}>{it ? money(it.price * it.quantity) : ''}</td>
              </tr>
            ))}
            <tr>
              <td style={{ background: RED }} />
              <td style={{ ...td, background: RED, color: '#fff', textAlign: 'left', fontWeight: 700, borderRight: 'none' }}>Total</td>
              {showHsn && <td style={{ background: RED, borderRight: 'none' }} />}
              {showBatch && <td style={{ background: RED, borderRight: 'none' }} />}
              {showMfdExp && <td style={{ background: RED, borderRight: 'none' }} />}
              <td style={{ ...td, background: RED, color: '#fff', fontWeight: 700, borderRight: 'none' }}>
                {items.reduce((s, l) => s + l.quantity, 0)}
              </td>
              <td style={{ background: RED, borderRight: 'none' }} />
              <td style={{ background: RED, borderRight: 'none' }} />
              <td style={{ ...td, background: RED, color: '#fff', fontWeight: 700, borderRight: 'none' }}>{money(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* QR + summary */}
      <div style={{ display: 'flex', gap: 20, padding: '14px 26px 0' }}>
        <div style={{ width: 300 }}>
          {paymentQr ? (
            <div>
              <img src={paymentQr} alt="Scan to pay" style={{ width: 108, height: 108, display: 'block' }} />
              <div style={{
                display: 'inline-block', marginTop: 3, background: '#efefef',
                fontSize: 8, fontWeight: 700, letterSpacing: 0.4, padding: '2px 4px',
              }}>
                <span style={{ color: '#0a5', marginRight: 3 }}>UPI</span>
                <span style={{ color: '#333' }}>SCAN &amp; PAY {money(total)}</span>
              </div>
              {upiId ? <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{upiId}</div> : null}
            </div>
          ) : null}

          <div style={{ color: ACCENT, fontSize: baseFont + 2, fontWeight: 700, marginTop: 14 }}>Invoice Amount In Words</div>
          <div style={{ fontSize: baseFont, marginTop: 3 }}>{rupeesInWords(total)}</div>

          <div style={{ color: ACCENT, fontSize: baseFont + 2, fontWeight: 700, marginTop: 14 }}>Terms And Conditions</div>
          <div style={{ fontSize: baseFont, marginTop: 3, whiteSpace: 'pre-line' }}>{design.terms || terms}</div>

          {design.show_loyalty && loyalty ? (
            <div style={{ marginTop: 14, border: `1px solid ${ACCENT}`, borderRadius: 8, padding: 8 }}>
              <div style={{ color: ACCENT, fontSize: baseFont + 1, fontWeight: 700 }}>Loyalty Card</div>
              <div style={{ fontSize: baseFont - 1, marginTop: 3 }}>
                {loyalty.stamps} of {loyalty.required} stamps collected — reach {loyalty.required} to get ₹{loyalty.rewardAmount} off.
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 5 }}>
                {Array.from({ length: loyalty.required }).map((_, i) => (
                  <span key={i} style={{
                    width: 16, height: 16, borderRadius: 8, fontSize: 9, lineHeight: '16px', textAlign: 'center',
                    border: `1px solid ${ACCENT}`, color: i < loyalty.stamps ? '#fff' : ACCENT,
                    background: i < loyalty.stamps ? ACCENT : '#fff',
                  }}>{i + 1}</span>
                ))}
              </div>
            </div>
          ) : null}

          {ratingQr ? (
            <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <img src={ratingQr} alt="Rate your order" style={{ width: 74, height: 74 }} />
              <div style={{ fontSize: baseFont - 2, color: '#333', maxWidth: 190 }}>
                <div style={{ fontWeight: 700, color: ACCENT, fontSize: baseFont - 1 }}>Rate your order</div>
                <div style={{ wordBreak: 'break-all' }}>{ratingUrl}</div>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={sumLabel}>Sub Total</td><td style={sumValue}>{money(subtotal)}</td></tr>
              {shippingCost > 0 && (
                <tr><td style={sumLabel}>Courier / Delivery</td><td style={sumValue}>{money(shippingCost)}</td></tr>
              )}
              {typeof gstAmount === 'number' && gstAmount > 0 && (
                <tr>
                  <td style={sumLabel}>GST{gstRate ? ` @ ${gstRate}%` : ''}</td>
                  <td style={sumValue}>{money(gstAmount)}</td>
                </tr>
              )}
              <tr>
                <td style={{ ...sumLabel, background: TOTALS, color: '#fff', fontWeight: 700 }}>Total</td>
                <td style={{ ...sumValue, background: TOTALS, color: '#fff', fontWeight: 700 }}>{money(total)}</td>
              </tr>
              <tr><td style={sumLabel}>Received</td><td style={sumValue}>{money(received)}</td></tr>
              <tr>
                <td style={{ ...sumLabel, fontWeight: balance > 0 ? 700 : 400, color: balance > 0 ? ACCENT : '#111' }}>
                  {balance > 0 ? 'Balance to Pay' : 'Balance'}
                </td>
                <td style={{ ...sumValue, fontWeight: balance > 0 ? 700 : 400, color: balance > 0 ? ACCENT : '#111' }}>{money(balance)}</td>
              </tr>
              <tr><td style={sumLabel}>Payment Mode</td><td style={sumValue}>{paymentMode}</td></tr>
              {typeof loyaltyPoints === 'number' && design.show_loyalty && (
                <tr><td style={sumLabel}>Available Points</td><td style={sumValue}>{loyaltyPoints}</td></tr>
              )}
            </tbody>
          </table>

          {design.show_delivery && delivery ? (
            <div style={{ marginTop: 12, border: cellBorder, borderRadius: 6, padding: 8, fontSize: baseFont - 1 }}>
              <div style={{ color: ACCENT, fontWeight: 700, fontSize: baseFont }}>Delivery Details</div>
              <div style={{ marginTop: 4 }}>
                <strong>From:</strong> {delivery.fromName}, {delivery.fromPhone}<br />
                {delivery.fromAddress}
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>To:</strong> {delivery.toName}, {delivery.toPhone}<br />
                {delivery.toAddress}
              </div>
            </div>
          ) : null}

          {design.show_signature ? (
            <div style={{ marginTop: 22, textAlign: 'right', fontSize: baseFont - 1 }}>
              <div style={{ borderTop: `1px solid ${DARK}`, display: 'inline-block', paddingTop: 4, minWidth: 160 }}>
                Authorised Signatory
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {design.footer_note ? (
        <div style={{ padding: '12px 26px 0', fontSize: baseFont - 1, color: '#444', textAlign: 'center' }}>
          {design.footer_note}
        </div>
      ) : null}

      {/* Bottom band */}
      <div style={{ display: 'flex', marginTop: 26, height: 34 }}>
        <div style={{ background: RED, flex: 1 }} />
        <div style={{ background: DARK, width: 300, borderTopLeftRadius: 34 }} />
      </div>
    </div>
  );
});

InvoiceBill.displayName = 'InvoiceBill';

export default InvoiceBill;
