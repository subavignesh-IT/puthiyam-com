import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Percent, Save, Sparkles, Download, FileText, Users, Receipt } from 'lucide-react';
import { GST_RATES, gstBreakup, inr, isValidGstin, round2 } from '@/lib/gst';

interface ProductRow { id: string; name: string; category: string; gst_rate: number | null; hsn_code: string | null }
interface OrderRow {
  id: string; order_number: string | null; customer_name: string; customer_phone: string;
  total: number; created_at: string; sale_channel: string; payment_status: string;
  gst_rate: number | null; gst_amount: number | null; taxable_value: number | null;
}

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${new Date().toISOString().slice(0, 7)}-01`;

const GstTab: React.FC<{ sellerId: string }> = ({ sellerId }) => {
  const [gstin, setGstin] = useState('');
  const [legalName, setLegalName] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [defaultRate, setDefaultRate] = useState('0');
  const [inclusive, setInclusive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [edits, setEdits] = useState<Record<string, { gst_rate?: string; hsn_code?: string }>>({});
  const [suggesting, setSuggesting] = useState(false);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState('');
  const [summarising, setSummarising] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from('gst_settings').select('*').eq('seller_id', sellerId).maybeSingle(),
        supabase.from('products').select('id, name, category, gst_rate, hsn_code').eq('seller_id', sellerId).order('name'),
      ]);
      if (s) {
        setGstin((s as any).gstin || '');
        setLegalName((s as any).legal_name || '');
        setPlaceOfSupply((s as any).place_of_supply || '');
        setDefaultRate(String((s as any).default_rate ?? 0));
        setInclusive(!!(s as any).prices_include_gst);
      }
      setProducts((p as any) || []);
    };
    load();
  }, [sellerId]);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_phone, total, created_at, sale_channel, payment_status, gst_rate, gst_amount, taxable_value')
      .eq('user_id', sellerId)
      .gte('created_at', new Date(from).toISOString())
      .lte('created_at', new Date(`${to}T23:59:59`).toISOString())
      .order('created_at', { ascending: false });
    if (error) { toast({ title: 'Could not load bills', description: error.message, variant: 'destructive' }); return; }
    setOrders((data as any) || []);
  };

  useEffect(() => { loadOrders(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sellerId, from, to]);

  const rate = Number(defaultRate) || 0;

  const billRows = useMemo(() => orders.map(o => {
    const effRate = o.gst_rate ?? rate;
    const b = o.gst_amount != null && o.taxable_value != null
      ? { rate: effRate, taxableValue: Number(o.taxable_value), gstAmount: Number(o.gst_amount), total: Number(o.total), cgst: round2(Number(o.gst_amount) / 2), sgst: round2(Number(o.gst_amount) / 2) }
      : gstBreakup(Number(o.total), effRate, inclusive);
    return { ...o, ...b };
  }), [orders, rate, inclusive]);

  const totals = useMemo(() => billRows.reduce((a, r) => ({
    bills: a.bills + 1,
    taxableValue: round2(a.taxableValue + r.taxableValue),
    gstAmount: round2(a.gstAmount + r.gstAmount),
    total: round2(a.total + Number(r.total)),
  }), { bills: 0, taxableValue: 0, gstAmount: 0, total: 0 }), [billRows]);

  const byRate = useMemo(() => {
    const map = new Map<number, { rate: number; taxableValue: number; gstAmount: number }>();
    billRows.forEach(r => {
      const cur = map.get(r.rate) || { rate: r.rate, taxableValue: 0, gstAmount: 0 };
      cur.taxableValue = round2(cur.taxableValue + r.taxableValue);
      cur.gstAmount = round2(cur.gstAmount + r.gstAmount);
      map.set(r.rate, cur);
    });
    return [...map.values()].sort((a, b) => a.rate - b.rate);
  }, [billRows]);

  const byCustomer = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; bills: number; taxableValue: number; gstAmount: number; total: number }>();
    billRows.forEach(r => {
      const k = r.customer_phone || r.customer_name;
      const cur = map.get(k) || { name: r.customer_name, phone: r.customer_phone, bills: 0, taxableValue: 0, gstAmount: 0, total: 0 };
      cur.bills += 1;
      cur.taxableValue = round2(cur.taxableValue + r.taxableValue);
      cur.gstAmount = round2(cur.gstAmount + r.gstAmount);
      cur.total = round2(cur.total + Number(r.total));
      map.set(k, cur);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [billRows]);

  const saveSettings = async () => {
    const g = gstin.trim().toUpperCase();
    if (g && !isValidGstin(g)) {
      toast({ title: 'Check the GST number', description: 'It should look like 33ABCDE1234F1Z5', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('gst_settings').upsert({
      seller_id: sellerId,
      gstin: g || null,
      legal_name: legalName.trim() || null,
      place_of_supply: placeOfSupply.trim() || null,
      default_rate: rate,
      prices_include_gst: inclusive,
    } as any, { onConflict: 'seller_id' });
    setSaving(false);
    if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'GST settings saved' });
  };

  const pVal = (p: ProductRow, k: 'gst_rate' | 'hsn_code') =>
    edits[p.id]?.[k] ?? (p[k] == null ? '' : String(p[k]));

  const saveProduct = async (p: ProductRow) => {
    const r = pVal(p, 'gst_rate');
    const h = pVal(p, 'hsn_code');
    const { error } = await supabase.from('products')
      .update({ gst_rate: r === '' ? null : Number(r), hsn_code: h.trim() || null } as any)
      .eq('id', p.id);
    if (error) { toast({ title: `Failed for ${p.name}`, description: error.message, variant: 'destructive' }); return; }
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, gst_rate: r === '' ? null : Number(r), hsn_code: h.trim() || null } : x));
    setEdits(prev => { const n = { ...prev }; delete n[p.id]; return n; });
    toast({ title: `GST saved for ${p.name}` });
  };

  const suggestRates = async () => {
    if (!products.length) return;
    setSuggesting(true);
    const { data, error } = await supabase.functions.invoke('gst-assist', {
      body: { mode: 'rates', products: products.map(p => ({ id: p.id, name: p.name, category: p.category })) },
    });
    setSuggesting(false);
    if (error) { toast({ title: 'AI suggestion failed', description: error.message, variant: 'destructive' }); return; }
    const suggestions = (data as any)?.suggestions || [];
    if (!suggestions.length) { toast({ title: 'No suggestions returned' }); return; }
    const next = { ...edits };
    suggestions.forEach((s: any) => {
      if (!s?.id) return;
      next[s.id] = {
        gst_rate: s.gst_rate != null ? String(s.gst_rate) : next[s.id]?.gst_rate,
        hsn_code: s.hsn_code ? String(s.hsn_code) : next[s.id]?.hsn_code,
      };
    });
    setEdits(next);
    toast({ title: 'AI suggestions ready', description: 'Review each product, then save the ones you accept.' });
  };

  const saveAllEdited = async () => {
    const changed = products.filter(p => edits[p.id]);
    if (!changed.length) { toast({ title: 'Nothing to save' }); return; }
    for (const p of changed) await saveProduct(p);
  };

  const aiSummary = async () => {
    setSummarising(true);
    const { data, error } = await supabase.functions.invoke('gst-assist', {
      body: { mode: 'summary', period: { from, to }, gstin: gstin || null, totals, byRate },
    });
    setSummarising(false);
    if (error) { toast({ title: 'AI summary failed', description: error.message, variant: 'destructive' }); return; }
    setSummary((data as any)?.summary || '');
  };

  const exportCsv = (kind: 'bill' | 'customer') => {
    const rows = kind === 'bill'
      ? [['Bill', 'Date', 'Customer', 'Phone', 'Channel', 'Rate %', 'Taxable', 'GST', 'CGST', 'SGST', 'Total'],
         ...billRows.map(r => [r.order_number || r.id.slice(0, 8), new Date(r.created_at).toLocaleDateString('en-IN'),
           r.customer_name, r.customer_phone, r.sale_channel, r.rate, r.taxableValue, r.gstAmount, r.cgst, r.sgst, r.total])]
      : [['Customer', 'Phone', 'Bills', 'Taxable', 'GST', 'Total'],
         ...byCustomer.map(c => [c.name, c.phone, c.bills, c.taxableValue, c.gstAmount, c.total])];
    const csv = rows.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `gst-${kind}-wise-${from}-to-${to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" /> GST Setup
            {gstin ? <Badge variant="outline" className="ml-1 font-mono">{gstin}</Badge> : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="gstin">GST number (GSTIN)</Label>
            <Input id="gstin" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="33ABCDE1234F1Z5" className="font-mono h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legal">Registered business name</Label>
            <Input id="legal" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="PUTHIYAM PRODUCTS" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pos">Place of supply</Label>
            <Input id="pos" value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} placeholder="Tamil Nadu" className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate">Default GST rate (%)</Label>
            <Input id="rate" type="number" min={0} max={28} step="0.01" value={defaultRate} onChange={e => setDefaultRate(e.target.value)} className="h-11" />
            <div className="flex flex-wrap gap-1 pt-1">
              {GST_RATES.map(r => (
                <Button key={r} type="button" size="sm" variant={rate === r ? 'default' : 'outline'} onClick={() => setDefaultRate(String(r))}>{r}%</Button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
            <div>
              <p className="font-medium">My prices already include GST</p>
              <p className="text-xs text-muted-foreground">
                {inclusive ? 'GST is extracted from the bill total.' : 'GST is added on top of the bill total.'}
              </p>
            </div>
            <Switch checked={inclusive} onCheckedChange={setInclusive} />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={saveSettings} disabled={saving} className="h-11">
              <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save GST settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rates">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="rates">Product rates</TabsTrigger>
          <TabsTrigger value="bills">Bill-wise</TabsTrigger>
          <TabsTrigger value="customers">Customer-wise</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="mt-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 flex-wrap space-y-0">
              <CardTitle className="text-base">Rate &amp; HSN per product</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={suggestRates} disabled={suggesting}>
                  <Sparkles className="w-4 h-4 mr-1" /> {suggesting ? 'Asking AI…' : 'AI suggest'}
                </Button>
                <Button size="sm" onClick={saveAllEdited}>
                  <Save className="w-4 h-4 mr-1" /> Save all
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {products.length === 0 ? (
                <p className="text-muted-foreground py-4">No products yet.</p>
              ) : products.map(p => (
                <div key={p.id} className="rounded-lg border p-3 space-y-2 transition-all hover:shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{p.name}</p>
                    {edits[p.id] ? <Badge className="shrink-0">Unsaved</Badge> : null}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number" min={0} max={28} step="0.01" placeholder={`Rate (default ${rate}%)`}
                      value={pVal(p, 'gst_rate')}
                      onChange={e => setEdits(prev => ({ ...prev, [p.id]: { ...prev[p.id], gst_rate: e.target.value } }))}
                      className="h-10"
                    />
                    <Input
                      placeholder="HSN code"
                      value={pVal(p, 'hsn_code')}
                      onChange={e => setEdits(prev => ({ ...prev, [p.id]: { ...prev[p.id], hsn_code: e.target.value } }))}
                      className="h-10 font-mono"
                    />
                    <Button size="icon" className="h-10 w-10 shrink-0" onClick={() => saveProduct(p)} title="Save">
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="mt-3">
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" /> Bill-wise GST
              </CardTitle>
              <div className="grid grid-cols-2 md:flex gap-2">
                <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-10" aria-label="From" />
                <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-10" aria-label="To" />
                <Button variant="outline" className="h-10" onClick={() => exportCsv('bill')}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Button variant="outline" className="h-10" onClick={aiSummary} disabled={summarising}>
                  <FileText className="w-4 h-4 mr-1" /> {summarising ? 'Writing…' : 'AI filing summary'}
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Bills" value={String(totals.bills)} />
                <Stat label="Taxable value" value={inr(totals.taxableValue)} />
                <Stat label="GST payable" value={inr(totals.gstAmount)} />
                <Stat label="Sales total" value={inr(totals.total)} />
              </div>
              {byRate.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {byRate.map(r => (
                    <Badge key={r.rate} variant="outline">{r.rate}% — {inr(r.gstAmount)} on {inr(r.taxableValue)}</Badge>
                  ))}
                </div>
              )}
              {summary && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm whitespace-pre-wrap">{summary}</div>
              )}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Bill</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3 text-right">Rate</th>
                    <th className="py-2 pr-3 text-right">Taxable</th>
                    <th className="py-2 pr-3 text-right">CGST</th>
                    <th className="py-2 pr-3 text-right">SGST</th>
                    <th className="py-2 pr-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {billRows.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-2 pr-3 font-mono text-xs">{r.order_number || r.id.slice(0, 8)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="py-2 pr-3">{r.customer_name}</td>
                      <td className="py-2 pr-3 text-right">{r.rate}%</td>
                      <td className="py-2 pr-3 text-right">{inr(r.taxableValue)}</td>
                      <td className="py-2 pr-3 text-right">{inr(r.cgst)}</td>
                      <td className="py-2 pr-3 text-right">{inr(r.sgst)}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{inr(Number(r.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {billRows.length === 0 && <p className="text-muted-foreground text-center py-6">No bills in this period.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="mt-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Customer-wise GST
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportCsv('customer')}>
                <Download className="w-4 h-4 mr-1" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3 text-right">Bills</th>
                    <th className="py-2 pr-3 text-right">Taxable</th>
                    <th className="py-2 pr-3 text-right">GST</th>
                    <th className="py-2 pr-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {byCustomer.map(c => (
                    <tr key={c.phone + c.name} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-2 pr-3 font-medium">{c.name}</td>
                      <td className="py-2 pr-3">{c.phone}</td>
                      <td className="py-2 pr-3 text-right">{c.bills}</td>
                      <td className="py-2 pr-3 text-right">{inr(c.taxableValue)}</td>
                      <td className="py-2 pr-3 text-right">{inr(c.gstAmount)}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{inr(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {byCustomer.length === 0 && <p className="text-muted-foreground text-center py-6">No customers in this period.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

export default GstTab;