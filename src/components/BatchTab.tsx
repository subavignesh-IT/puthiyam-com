import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Boxes, Trash2, Plus, AlertTriangle, Search } from 'lucide-react';

interface Props { sellerId: string }

interface VariantRow { id: string; product_id: string; quantity: number; price: number }
interface ProductRow { id: string; name: string }
interface BatchRow {
  id: string; product_id: string; variant_id: string | null; batch_no: string;
  mfd_date: string | null; exp_date: string | null; quantity: number;
  purchase_price: number | null; barcode: string | null; barcode_status?: string | null; notes: string | null;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const daysLeft = (exp: string | null) => {
  if (!exp) return null;
  return Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000);
};

const BatchTab: React.FC<Props> = ({ sellerId }) => {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_id: '', variant_id: '', batch_no: '', mfd_date: '', exp_date: '',
    quantity: '', purchase_price: '', notes: '',
  });

  const load = async () => {
    const [{ data: p }, { data: b }] = await Promise.all([
      supabase.from('products').select('id, name').eq('seller_id', sellerId).order('name'),
      supabase.from('product_batches' as any).select('*').eq('seller_id', sellerId).order('created_at', { ascending: false }),
    ]);
    const list = (p as ProductRow[]) || [];
    setProducts(list);
    setBatches(((b as any[]) || []) as BatchRow[]);
    if (list.length) {
      const { data: v } = await supabase
        .from('product_variants')
        .select('id, product_id, quantity, price')
        .in('product_id', list.map(x => x.id));
      setVariants((v as VariantRow[]) || []);
    } else setVariants([]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sellerId]);

  const formVariants = useMemo(
    () => variants.filter(v => v.product_id === form.product_id),
    [variants, form.product_id],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter(b => {
      const name = products.find(p => p.id === b.product_id)?.name || '';
      return b.batch_no.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    });
  }, [batches, search, products]);

  const expiringSoon = useMemo(
    () => batches.filter(b => {
      const d = daysLeft(b.exp_date);
      return d !== null && d <= 30 && b.quantity > 0;
    }),
    [batches],
  );

  const addBatch = async () => {
    if (!form.product_id || !form.batch_no.trim()) {
      toast({ title: 'Choose a product and enter a batch number', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      seller_id: sellerId,
      product_id: form.product_id,
      variant_id: form.variant_id || null,
      batch_no: form.batch_no.trim(),
      mfd_date: form.mfd_date || null,
      exp_date: form.exp_date || null,
      quantity: Math.max(0, parseInt(form.quantity) || 0),
      purchase_price: form.purchase_price === '' ? null : Number(form.purchase_price),
      notes: form.notes.trim() || null,
      barcode_status: 'pending',
    };
    const { error } = await supabase.from('product_batches' as any).insert(payload);
    setSaving(false);
    if (error) { toast({ title: 'Could not save batch', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Batch added' });
    setForm({ product_id: form.product_id, variant_id: '', batch_no: '', mfd_date: '', exp_date: '', quantity: '', purchase_price: '', notes: '' });
    load();
  };

  const removeBatch = async (id: string) => {
    const { error } = await supabase.from('product_batches' as any).delete().eq('id', id);
    if (error) { toast({ title: 'Could not delete', description: error.message, variant: 'destructive' }); return; }
    setBatches(prev => prev.filter(b => b.id !== id));
    toast({ title: 'Batch deleted' });
  };

  const updateQty = async (id: string, qty: number) => {
    const value = Math.max(0, qty);
    setBatches(prev => prev.map(b => (b.id === id ? { ...b, quantity: value } : b)));
    await supabase.from('product_batches' as any).update({ quantity: value }).eq('id', id);
  };

  const variantLabel = (b: BatchRow) => {
    const v = variants.find(x => x.id === b.variant_id);
    return v ? `${v.quantity}` : 'All variants';
  };

  return (
    <div className="space-y-4">
      {expiringSoon.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">{expiringSoon.length} batch(es) expiring within 30 days</p>
              <p className="text-muted-foreground">
                {expiringSoon.slice(0, 4).map(b => `${b.batch_no} (${b.exp_date})`).join(', ')}
                {expiringSoon.length > 4 ? '…' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Add Batch</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-sm">Product</Label>
            <Select value={form.product_id} onValueChange={v => setForm(f => ({ ...f, product_id: v, variant_id: '' }))}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Variant (optional)</Label>
            <Select value={form.variant_id} onValueChange={v => setForm(f => ({ ...f, variant_id: v }))}>
              <SelectTrigger><SelectValue placeholder="All variants" /></SelectTrigger>
              <SelectContent>
                {formVariants.map(v => <SelectItem key={v.id} value={v.id}>{v.quantity} — ₹{v.price}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Batch number</Label>
            <Input value={form.batch_no} onChange={e => setForm(f => ({ ...f, batch_no: e.target.value }))} placeholder="B-2601" />
          </div>
          <div>
            <Label className="text-sm">Quantity</Label>
            <Input type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
          </div>
          <div>
            <Label className="text-sm">MFD date</Label>
            <Input type="date" max={todayIso()} value={form.mfd_date} onChange={e => setForm(f => ({ ...f, mfd_date: e.target.value }))} />
          </div>
          <div>
            <Label className="text-sm">EXP date</Label>
            <Input type="date" value={form.exp_date} onChange={e => setForm(f => ({ ...f, exp_date: e.target.value }))} />
          </div>
          <div>
            <Label className="text-sm">Purchase price ₹</Label>
            <Input type="number" min={0} step="0.01" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} />
          </div>
          <div>
            <Label className="text-sm">Notes</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Supplier / remarks" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button onClick={addBatch} disabled={saving} className="gradient-hero text-primary-foreground">
              {saving ? 'Saving…' : 'Add batch'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2"><Boxes className="w-4 h-4 text-primary" /> Batches ({batches.length})</CardTitle>
          <div className="relative w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Search batch or product" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No batches yet.</p>
          ) : filtered.map(b => {
            const left = daysLeft(b.exp_date);
            const expired = left !== null && left < 0;
            return (
              <div key={b.id} className="rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{products.find(p => p.id === b.product_id)?.name || 'Product'}</span>
                    <Badge variant="outline">{variantLabel(b)}</Badge>
                    <Badge>{b.batch_no}</Badge>
                    {expired && <Badge variant="destructive">Expired</Badge>}
                    {!expired && left !== null && left <= 30 && <Badge className="bg-amber-500 text-white">{left}d left</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    MFD {b.mfd_date || '-'} • EXP {b.exp_date || '-'}
                    {b.purchase_price !== null ? ` • Cost ₹${b.purchase_price}` : ''}
                    {b.notes ? ` • ${b.notes}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Qty</Label>
                  <Input
                    type="number" min={0} value={b.quantity}
                    onChange={e => updateQty(b.id, parseInt(e.target.value) || 0)}
                    className="h-9 w-24"
                  />
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeBatch(b.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchTab;
