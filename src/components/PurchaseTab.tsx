import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ClipboardList, Trash2, TrendingUp } from 'lucide-react';

interface Props { sellerId: string }

interface ProductRow { id: string; name: string }
interface VariantRow { id: string; product_id: string; quantity: number; price: number; stock_quantity: number }
interface BatchRow { id: string; product_id: string; batch_no: string }
interface PurchaseRow {
  id: string; product_id: string; variant_id: string | null; batch_id: string | null;
  supplier: string | null; invoice_no: string | null; purchase_date: string;
  quantity: number; purchase_price: number; notes: string | null;
}

const PurchaseTab: React.FC<Props> = ({ sellerId }) => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [restock, setRestock] = useState(true);
  const [form, setForm] = useState({
    product_id: '', variant_id: '', batch_id: '', supplier: '', invoice_no: '',
    purchase_date: new Date().toISOString().slice(0, 10), quantity: '', purchase_price: '', notes: '',
  });

  const load = async () => {
    const [{ data: p }, { data: pu }, { data: b }] = await Promise.all([
      supabase.from('products').select('id, name').eq('seller_id', sellerId).order('name'),
      supabase.from('product_purchases' as any).select('*').eq('seller_id', sellerId).order('purchase_date', { ascending: false }),
      supabase.from('product_batches' as any).select('id, product_id, batch_no').eq('seller_id', sellerId),
    ]);
    const list = (p as ProductRow[]) || [];
    setProducts(list);
    setRows(((pu as any[]) || []) as PurchaseRow[]);
    setBatches(((b as any[]) || []) as BatchRow[]);
    if (list.length) {
      const { data: v } = await supabase
        .from('product_variants')
        .select('id, product_id, quantity, price, stock_quantity')
        .in('product_id', list.map(x => x.id));
      setVariants((v as VariantRow[]) || []);
    } else setVariants([]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sellerId]);

  const formVariants = useMemo(() => variants.filter(v => v.product_id === form.product_id), [variants, form.product_id]);
  const formBatches = useMemo(() => batches.filter(b => b.product_id === form.product_id), [batches, form.product_id]);

  const totals = useMemo(() => {
    const spend = rows.reduce((s, r) => s + r.purchase_price * r.quantity, 0);
    const units = rows.reduce((s, r) => s + r.quantity, 0);
    return { spend, units, avg: units ? spend / units : 0 };
  }, [rows]);

  const avgCostFor = (productId: string, variantId?: string | null) => {
    const rel = rows.filter(r => r.product_id === productId && (!variantId || r.variant_id === variantId));
    const units = rel.reduce((s, r) => s + r.quantity, 0);
    if (!units) return null;
    return rel.reduce((s, r) => s + r.purchase_price * r.quantity, 0) / units;
  };

  const save = async () => {
    const qty = parseInt(form.quantity) || 0;
    if (!form.product_id || qty <= 0) {
      toast({ title: 'Choose a product and enter a quantity', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('product_purchases' as any).insert({
      seller_id: sellerId,
      product_id: form.product_id,
      variant_id: form.variant_id || null,
      batch_id: form.batch_id || null,
      supplier: form.supplier.trim() || null,
      invoice_no: form.invoice_no.trim() || null,
      purchase_date: form.purchase_date,
      quantity: qty,
      purchase_price: Number(form.purchase_price) || 0,
      notes: form.notes.trim() || null,
    });
    if (error) {
      setSaving(false);
      toast({ title: 'Could not save purchase', description: error.message, variant: 'destructive' });
      return;
    }

    if (restock && form.variant_id) {
      const v = variants.find(x => x.id === form.variant_id);
      const next = Number(v?.stock_quantity ?? 0) + qty;
      await supabase.from('product_variants').update({ stock_quantity: next }).eq('id', form.variant_id);
      await supabase.from('stock_audit_log' as any).insert({
        seller_id: sellerId, product_id: form.product_id, variant_id: form.variant_id,
        product_name: products.find(p => p.id === form.product_id)?.name || null,
        variant_label: v ? String(v.quantity) : null,
        change_qty: qty, stock_before: Number(v?.stock_quantity ?? 0), stock_after: next,
        reason: 'purchase restock', created_by: sellerId,
      });
    }
    if (restock && form.batch_id) {
      const { data: cur } = await supabase.from('product_batches' as any).select('quantity').eq('id', form.batch_id).maybeSingle();
      await supabase.from('product_batches' as any)
        .update({ quantity: Number((cur as any)?.quantity ?? 0) + qty })
        .eq('id', form.batch_id);
    }

    setSaving(false);
    toast({ title: 'Purchase recorded', description: restock ? 'Stock updated' : undefined });
    setForm(f => ({ ...f, quantity: '', purchase_price: '', invoice_no: '', notes: '' }));
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('product_purchases' as any).delete().eq('id', id);
    if (error) { toast({ title: 'Could not delete', description: error.message, variant: 'destructive' }); return; }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total purchase spend</p>
          <p className="text-2xl font-bold text-primary">₹{totals.spend.toFixed(2)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Units purchased</p>
          <p className="text-2xl font-bold">{totals.units}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Average unit cost</p>
          <p className="text-2xl font-bold">₹{totals.avg.toFixed(2)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> Record Purchase / Restock
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-sm">Product</Label>
            <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v, variant_id: '', batch_id: '' }))}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Variant</Label>
            <Select value={form.variant_id} onValueChange={v => setForm(f => ({ ...f, variant_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{formVariants.map(v => <SelectItem key={v.id} value={v.id}>{v.quantity} — ₹{v.price}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Batch</Label>
            <Select value={form.batch_id} onValueChange={v => setForm(f => ({ ...f, batch_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{formBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.batch_no}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Purchase date</Label>
            <Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
          </div>
          <div>
            <Label className="text-sm">Quantity</Label>
            <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
          </div>
          <div>
            <Label className="text-sm">Purchase price ₹ / unit</Label>
            <Input type="number" min={0} step="0.01" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} />
          </div>
          <div>
            <Label className="text-sm">Supplier</Label>
            <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
          </div>
          <div>
            <Label className="text-sm">Supplier invoice no.</Label>
            <Input value={form.invoice_no} onChange={e => setForm(f => ({ ...f, invoice_no: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3">
            <Button onClick={save} disabled={saving} className="gradient-hero text-primary-foreground">
              {saving ? 'Saving…' : 'Save purchase'}
            </Button>
            <Button variant={restock ? 'default' : 'outline'} size="sm" onClick={() => setRestock(v => !v)}>
              <TrendingUp className="w-4 h-4 mr-1" /> {restock ? 'Adds to stock' : 'Record only'}
            </Button>
            {form.product_id && (
              <span className="text-sm text-muted-foreground">
                Average cost so far: {avgCostFor(form.product_id, form.variant_id || null) !== null
                  ? `₹${avgCostFor(form.product_id, form.variant_id || null)!.toFixed(2)}`
                  : 'no data'}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Purchase history ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No purchases recorded yet.</p>
          ) : rows.map(r => (
            <div key={r.id} className="rounded-lg border p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{products.find(p => p.id === r.product_id)?.name || 'Product'}</span>
                  {r.variant_id && <Badge variant="outline">{variants.find(v => v.id === r.variant_id)?.quantity}</Badge>}
                  {r.batch_id && <Badge>{batches.find(b => b.id === r.batch_id)?.batch_no}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {r.purchase_date} • {r.quantity} × ₹{r.purchase_price} = ₹{(r.quantity * r.purchase_price).toFixed(2)}
                  {r.supplier ? ` • ${r.supplier}` : ''}{r.invoice_no ? ` • Inv ${r.invoice_no}` : ''}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(r.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseTab;
