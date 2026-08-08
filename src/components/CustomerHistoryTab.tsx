import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Users, Search, Star, Receipt, ChevronRight, Send } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import InvoiceBill, { InvoiceLine } from '@/components/InvoiceBill';
import InvoiceActions from '@/components/InvoiceActions';
import { inr } from '@/lib/gst';
import { sendBillToCustomer, buildThankYouMessage, recordBillDelivery } from '@/lib/billDelivery';

interface OrderRow {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  items: any;
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  sale_channel: string;
  created_at: string;
  gst_rate: number | null;
  gst_amount: number | null;
  seller_gstin: string | null;
}

interface FeedbackRow {
  id: string;
  order_id: string | null;
  customer_phone: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

const paidBadge = (o: OrderRow) => {
  const s = (o.payment_status || '').toLowerCase();
  if (s === 'paid' || s === 'completed' || s === 'success') return <Badge className="bg-green-600 text-white">Paid</Badge>;
  if (s === 'partial') return <Badge className="bg-amber-500 text-white">Part paid</Badge>;
  return <Badge variant="outline">Pending</Badge>;
};

const CustomerHistoryTab: React.FC<{ sellerId: string; isAdmin?: boolean }> = ({ sellerId, isAdmin }) => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrderRow | null>(null);
  const [upiId, setUpiId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const billRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      let oq = supabase.from('orders')
        .select('id, order_number, customer_name, customer_phone, customer_address, items, subtotal, shipping_cost, total, payment_method, payment_status, order_status, sale_channel, created_at, gst_rate, gst_amount, seller_gstin')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (!isAdmin) oq = oq.eq('user_id', sellerId);
      let fq = supabase.from('pos_feedback').select('id, order_id, customer_phone, rating, comment, created_at');
      if (!isAdmin) fq = fq.eq('seller_id', sellerId);
      const [{ data: o }, { data: f }, { data: prof }] = await Promise.all([
        oq, fq, supabase.from('profiles').select('upi_id').eq('user_id', sellerId).maybeSingle(),
      ]);
      setOrders((o as any) || []);
      setFeedback((f as any) || []);
      setUpiId((prof as any)?.upi_id || null);
    };
    load();
  }, [sellerId, isAdmin]);

  const customers = useMemo(() => {
    const map = new Map<string, { key: string; name: string; phone: string; orders: OrderRow[]; total: number; pending: number }>();
    orders.forEach(o => {
      const key = (o.customer_phone || o.customer_name || 'unknown').trim();
      const cur = map.get(key) || { key, name: o.customer_name, phone: o.customer_phone, orders: [], total: 0, pending: 0 };
      cur.orders.push(o);
      cur.total += Number(o.total) || 0;
      const s = (o.payment_status || '').toLowerCase();
      if (!['paid', 'completed', 'success'].includes(s)) cur.pending += Number(o.total) || 0;
      map.set(key, cur);
    });
    const list = [...map.values()].sort((a, b) => b.total - a.total);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(q));
  }, [orders, search]);

  const active = customers.find(c => c.key === selected) || null;

  const reviewsFor = (orderId: string) => feedback.filter(f => f.order_id === orderId);
  const customerReviews = (phone: string) => feedback.filter(f => (f.customer_phone || '') === phone);

  const lines = (o: OrderRow): InvoiceLine[] => {
    const items = Array.isArray(o.items) ? o.items : [];
    return items.map((it: any) => ({
      name: it.name || it.product_name || 'Item',
      quantity: Number(it.quantity) || 1,
      unit: it.unit || it.measurement_unit || 'Pcs',
      price: Number(it.price) || 0,
    }));
  };

  const getJpeg = async () => {
    if (!billRef.current) throw new Error('Invoice is not ready');
    return toJpeg(billRef.current, { quality: 0.92, backgroundColor: '#ffffff', pixelRatio: 2 });
  };

  const resend = async (o: OrderRow) => {
    setSending(true);
    try {
      const image = await getJpeg();
      const paid = ['paid', 'completed', 'success'].includes((o.payment_status || '').toLowerCase());
      const message = buildThankYouMessage({
        orderNumber: o.order_number || o.id.slice(0, 8),
        customerName: o.customer_name,
        total: Number(o.total),
        paid,
      });
      const res = await sendBillToCustomer({ phone: o.customer_phone, message, imageDataUrl: image, orderNumber: o.order_number || undefined });
      await recordBillDelivery({
        orderId: o.id,
        sellerId,
        orderNumber: o.order_number,
        phone: o.customer_phone,
        channel: res.channel,
        status: res.channel === 'none' ? 'failed' : 'sent',
        error: res.error || res.whatsappError || null,
      });
      toast({
        title: res.channel === 'none' ? 'Could not send the bill' : `Bill sent on ${res.channel}`,
        description: res.error || undefined,
        variant: res.channel === 'none' ? 'destructive' : 'default',
      });
    } catch (e: any) {
      toast({ title: 'Could not send the bill', description: String(e?.message || e), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Customer Order History
          <Badge variant="outline">{customers.length} customers</Badge>
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search customer name or phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-11" />
        </div>
      </CardHeader>
      <CardContent>
        {!active ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {customers.map(c => (
              <button
                key={c.key}
                onClick={() => setSelected(c.key)}
                className="text-left rounded-lg border p-3 hover:shadow-md hover:border-primary/50 transition-all flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.name || 'Walk-in customer'}</p>
                  <p className="text-xs text-muted-foreground">{c.phone || 'No phone'}</p>
                  <p className="text-xs mt-1">
                    {c.orders.length} bills · {inr(c.total)}
                    {c.pending > 0 ? <span className="text-destructive"> · {inr(c.pending)} pending</span> : null}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            {customers.length === 0 && <p className="text-muted-foreground py-6 text-center sm:col-span-2">No customers yet.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-lg">{active.name || 'Walk-in customer'}</p>
                <p className="text-sm text-muted-foreground">{active.phone}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Back to customers</Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Bills" value={String(active.orders.length)} />
              <Stat label="Spent" value={inr(active.total)} />
              <Stat label="Pending" value={inr(active.pending)} />
            </div>

            <div className="space-y-2">
              {active.orders.map(o => {
                const revs = reviewsFor(o.id);
                return (
                  <div key={o.id} className="rounded-lg border p-3 space-y-2 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{o.order_number || o.id.slice(0, 8)}</p>
                        <p className="text-sm">{new Date(o.created_at).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{o.sale_channel || 'online'}</Badge>
                        {paidBadge(o)}
                        <span className="font-semibold">{inr(Number(o.total))}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPreview(o)}>
                        <Receipt className="w-4 h-4 mr-1" /> Show bill
                      </Button>
                      <Button variant="outline" size="sm" disabled={sending || !o.customer_phone} onClick={() => { setPreview(o); setTimeout(() => resend(o), 700); }}>
                        <Send className="w-4 h-4 mr-1" /> Resend bill
                      </Button>
                    </div>
                    {revs.length > 0 && (
                      <div className="space-y-1 pt-1 border-t">
                        {revs.map(r => (
                          <div key={r.id} className="text-sm flex items-start gap-2">
                            <span className="flex shrink-0">
                              {[1, 2, 3, 4, 5].map(n => (
                                <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                              ))}
                            </span>
                            <span className="text-muted-foreground">{r.comment || 'No comment'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {customerReviews(active.phone).length > 0 && (
              <div className="rounded-lg border p-3">
                <p className="font-medium mb-2 flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> All reviews from this customer</p>
                <div className="space-y-1">
                  {customerReviews(active.phone).map(r => (
                    <p key={r.id} className="text-sm text-muted-foreground">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} — {r.comment || 'No comment'} ({new Date(r.created_at).toLocaleDateString('en-IN')})
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={!!preview} onOpenChange={o => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice {preview?.order_number || ''}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <InvoiceActions
                getJpeg={getJpeg}
                filename={`invoice-${preview.order_number || preview.id.slice(0, 8)}`}
                shareText={`Invoice ${preview.order_number || ''} — PUTHIYAM PRODUCTS`}
                receipt={{
                  invoiceNo: preview.order_number || preview.id.slice(0, 8),
                  date: new Date(preview.created_at).toLocaleString('en-IN'),
                  customerName: preview.customer_name,
                  customerPhone: preview.customer_phone,
                  gstin: preview.seller_gstin,
                  items: lines(preview),
                  subtotal: Number(preview.subtotal),
                  shippingCost: Number(preview.shipping_cost) || 0,
                  gstAmount: preview.gst_amount != null ? Number(preview.gst_amount) : null,
                  gstRate: preview.gst_rate != null ? Number(preview.gst_rate) : null,
                  total: Number(preview.total),
                  received: ['paid', 'completed', 'success'].includes((preview.payment_status || '').toLowerCase()) ? Number(preview.total) : 0,
                  paymentMode: preview.payment_method,
                }}
                compact
              />
              <div className="overflow-x-auto rounded-lg border bg-white">
                <InvoiceBill
                  ref={billRef}
                  invoiceNo={preview.order_number || preview.id.slice(0, 8)}
                  date={new Date(preview.created_at).toLocaleString('en-IN')}
                  customerName={preview.customer_name}
                  customerPhone={preview.customer_phone}
                  customerAddress={preview.customer_address}
                  items={lines(preview)}
                  subtotal={Number(preview.subtotal)}
                  shippingCost={Number(preview.shipping_cost) || 0}
                  total={Number(preview.total)}
                  received={['paid', 'completed', 'success'].includes((preview.payment_status || '').toLowerCase()) ? Number(preview.total) : 0}
                  paymentMode={preview.payment_method}
                  upiId={upiId || undefined}
                  gstin={preview.seller_gstin}
                  gstRate={preview.gst_rate}
                  gstAmount={preview.gst_amount}
                  ratingUrl={`${window.location.origin}/#/rate/${preview.id}`}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-base font-semibold">{value}</p>
  </div>
);

export default CustomerHistoryTab;