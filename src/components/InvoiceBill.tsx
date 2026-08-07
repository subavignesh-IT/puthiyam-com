import React, { forwardRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { rupeesInWords } from '@/lib/numberToWords';

export interface InvoiceLine {
  name: string;
  quantity: number;
  unit?: string;
  price: number;
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
  contactPhone?: string;
  contactEmail?: string;
  terms?: string;
}

const RED = '#e8202a';
const DARK = '#232630';
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
    contactPhone = '9361284773', contactEmail = 'puthiyamproduct@gmail.com',
    terms = 'Thank you for doing business with us.',
  } = props;

  const upiLink = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill ${invoiceNo}`)}`
    : '';
  const paymentQr = useQr(upiLink);
  const ratingQr = useQr(ratingUrl || '');

  const balance = Math.max(0, total - received);
  const rows = [...items];
  while (rows.length < MIN_ROWS) rows.push(null as any);

  const cellBorder = `1px solid ${DARK}22`;
  const th: React.CSSProperties = {
    background: RED, color: '#ffffff', fontSize: 12, fontWeight: 700,
    padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    fontSize: 12, padding: '9px 10px', textAlign: 'right', borderBottom: cellBorder,
    borderRight: cellBorder, color: '#111', height: 18,
  };
  const sumLabel: React.CSSProperties = { fontSize: 12, padding: '6px 8px', border: cellBorder, color: '#111' };
  const sumValue: React.CSSProperties = { ...sumLabel, textAlign: 'right', whiteSpace: 'nowrap' };

  return (
    <div
      ref={ref}
      style={{
        width: 720, background: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#111', position: 'relative', paddingBottom: 28,
      }}
    >
      {/* Top red band */}
      <div style={{
        background: RED, height: 66, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 48, color: '#fff', fontSize: 12,
      }}>
        <span style={{ borderRight: '1px solid #ffffff88', paddingRight: 14 }}>&#9742; {contactPhone}</span>
        <span>&#9993; {contactEmail}</span>
      </div>

      {/* Company + title */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{
          background: DARK, color: '#fff', padding: '14px 26px 16px',
          borderBottomRightRadius: 44, minWidth: 380,
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 0.5 }}>PUTHIYAM_PRODUCTS</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 26px' }}>
          <div style={{ fontSize: 28, fontWeight: 400 }}>Bill of Supply</div>
        </div>
      </div>

      {/* Bill to / invoice meta */}
      <div style={{ display: 'flex', padding: '18px 26px 12px', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: RED, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Bill To</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{customerName || 'Walk-in Customer'}</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            <strong>Contact No.:</strong>&nbsp;&nbsp;{customerPhone || '-'}
          </div>
          {customerAddress ? (
            <div style={{ fontSize: 12, marginTop: 2, maxWidth: 320 }}>
              <strong>Address:</strong>&nbsp;&nbsp;{customerAddress}
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 12, minWidth: 240 }}>
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
                <td style={td}>{it ? it.quantity : ''}</td>
                <td style={td}>{it ? (it.unit || 'Pcs') : ''}</td>
                <td style={td}>{it ? money(it.price) : ''}</td>
                <td style={td}>{it ? money(it.price * it.quantity) : ''}</td>
              </tr>
            ))}
            <tr>
              <td style={{ background: RED }} />
              <td style={{ ...td, background: RED, color: '#fff', textAlign: 'left', fontWeight: 700, borderRight: 'none' }}>Total</td>
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

          <div style={{ color: RED, fontSize: 14, fontWeight: 700, marginTop: 14 }}>Invoice Amount In Words</div>
          <div style={{ fontSize: 12, marginTop: 3 }}>{rupeesInWords(total)}</div>

          <div style={{ color: RED, fontSize: 14, fontWeight: 700, marginTop: 14 }}>Terms And Conditions</div>
          <div style={{ fontSize: 12, marginTop: 3 }}>{terms}</div>

          {ratingQr ? (
            <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <img src={ratingQr} alt="Rate your order" style={{ width: 74, height: 74 }} />
              <div style={{ fontSize: 10, color: '#333', maxWidth: 190 }}>
                <div style={{ fontWeight: 700, color: RED, fontSize: 11 }}>Rate your order</div>
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
              <tr>
                <td style={{ ...sumLabel, background: RED, color: '#fff', fontWeight: 700 }}>Total</td>
                <td style={{ ...sumValue, background: RED, color: '#fff', fontWeight: 700 }}>{money(total)}</td>
              </tr>
              <tr><td style={sumLabel}>Received</td><td style={sumValue}>{money(received)}</td></tr>
              <tr><td style={sumLabel}>Balance</td><td style={sumValue}>{money(balance)}</td></tr>
              <tr><td style={sumLabel}>Payment Mode</td><td style={sumValue}>{paymentMode}</td></tr>
              {typeof loyaltyPoints === 'number' && (
                <tr><td style={sumLabel}>Available Points</td><td style={sumValue}>{loyaltyPoints}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
