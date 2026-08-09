import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Barcode, Save, Wand2, ScanLine, Search, Printer, Download } from 'lucide-react';
import BarcodeScannerDialog from '@/components/BarcodeScannerDialog';
import { barcodeDataUrl, labelDataUrlAsync, printLabelSheetA4, printLabels } from '@/lib/barcodeImage';

interface Row {
  key: string;              // product id or `${productId}:${variantId}`
  productId: string;
  variantId?: string;
  name: string;
  label: string;            // variant label or category
  price?: number;
  barcode: string | null;
}

const genBarcode = (len: number, seedName: string) => {
  const digitsOnly = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const prefix = (seedName.replace(/[^A-Za-z]/g, '').slice(0, 2) || 'PP').toUpperCase();
  const target = Math.max(6, Math.min(24, len));
  const body = digitsOnly.slice(-Math.max(1, target - prefix.length));
  return `${prefix}${body}`.slice(0, target);
};

const BarcodeTabNew: React.FC<{ sellerId: string }> = ({ sellerId }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [codeLength, setCodeLength] = useState('12');
  const [saving, setSaving] = useState(false);
  const [scanFor, setScanFor] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const load = async () => {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, category, barcode, measurement_unit')
      .eq('seller_id', sellerId)
      .order('name');

    const ids = (products || []).map((p: any) => p.id);
    const { data: variants } = ids.length
      ? await supabase.from('product_variants').select('id, product_id, quantity, price, barcode').in('product_id', ids).order('price')
      : { data: [] as any[] };

    const next: Row[] = [];
    (products || []).forEach((p: any) => {
      next.push({ key: p.id, productId: p.id, name: p.name, label: p.category, barcode: p.barcode });
      (variants || [])
        .filter((v: any) => v.product_id === p.id)
        .forEach((v: any) => {
          next.push({
            key: `${p.id}:${v.id}`,
            productId: p.id,
            variantId: v.id,
            name: p.name,
            label: `${v.quantity}${p.measurement_unit}`,
            price: Number(v.price),
            barcode: v.barcode,
          });
        });
    });
    setRows(next);
    setEdits({});
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sellerId]);

  const value = (r: Row) => edits[r.key] ?? (r.barcode || '');

  const duplicates = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => {
      const v = (edits[r.key] ?? r.barcode ?? '').trim();
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return new Set(Object.keys(counts).filter(k => counts[k] > 1));
  }, [rows, edits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.label.toLowerCase().includes(q) ||
      (r.barcode || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const persist = async (r: Row, code: string) => {
    if (r.variantId) {
      return supabase.from('product_variants').update({ barcode: code || null } as any).eq('id', r.variantId);
    }
    return supabase.from('products').update({ barcode: code || null } as any).eq('id', r.productId);
  };

  const saveOne = async (r: Row) => {
    const v = value(r).trim();
    if (v && duplicates.has(v)) {
      toast({ title: 'Duplicate barcode', description: `${v} is already used`, variant: 'destructive' });
      return;
    }
    const { error } = await persist(r, v);
    if (error) { toast({ title: 'Could not save barcode', description: error.message, variant: 'destructive' }); return; }
    setRows(prev => prev.map(p => p.key === r.key ? { ...p, barcode: v || null } : p));
    setEdits(prev => { const n = { ...prev }; delete n[r.key]; return n; });
    toast({ title: `Barcode assigned for ${r.name} ${r.label}` });
  };

  const autoGenerateBlanks = () => {
    const len = parseInt(codeLength) || 12;
    const next = { ...edits };
    rows.forEach(r => { if (!value(r).trim()) next[r.key] = genBarcode(len, r.name); });
    setEdits(next);
    toast({ title: 'Barcodes generated', description: `${len}-character codes — review, then press Save all` });
  };

  const saveAll = async () => {
    const changed = rows.filter(r => edits[r.key] !== undefined);
    if (!changed.length) { toast({ title: 'Nothing to save' }); return; }
    const dupe = changed.find(r => duplicates.has(value(r).trim()));
    if (dupe) { toast({ title: 'Duplicate barcodes found', description: 'Fix duplicates before saving', variant: 'destructive' }); return; }
    setSaving(true);
    for (const r of changed) {
      const { error } = await persist(r, value(r).trim());
      if (error) toast({ title: `Failed for ${r.name}`, description: error.message, variant: 'destructive' });
    }
    setSaving(false);
    await load();
    toast({ title: 'Barcodes updated', description: 'Status is now Assigned' });
  };

  const assigned = rows.filter(r => (r.barcode || '').trim()).length;

  const downloadLabel = async (r: Row) => {
    const code = value(r).trim();
    if (!code) { toast({ title: 'Add a barcode first', variant: 'destructive' }); return; }
    const url = await labelDataUrlAsync(code, `${r.name} ${r.label}`, r.price);
    if (!url) { toast({ title: 'Could not create the label', variant: 'destructive' }); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = `label-${code}.png`;
    a.click();
    toast({ title: 'Label downloaded', description: '1 x 2.5 inch sticker ready to print' });
  };

  const printOne = async (r: Row) => {
    const code = value(r).trim();
    if (!code) { toast({ title: 'Add a barcode first', variant: 'destructive' }); return; }
    const url = await labelDataUrlAsync(code, `${r.name} ${r.label}`, r.price);
    if (url) printLabels([{ dataUrl: url, code }]);
  };

  const selectedRows = filtered.filter(r => selected[r.key] && value(r).trim());
  const totalSelectedLabels = selectedRows.reduce((s, r) => s + (copies[r.key] || 1), 0);

  const printSelectedSheet = async () => {
    if (!selectedRows.length) { toast({ title: 'Select at least one label' }); return; }
    setPrinting(true);
    const labels: { dataUrl: string; code: string }[] = [];
    for (const r of selectedRows) {
      const code = value(r).trim();
      const url = await labelDataUrlAsync(code, `${r.name} ${r.label}`, r.price);
      if (!url) continue;
      const n = Math.max(1, Math.min(200, copies[r.key] || 1));
      for (let i = 0; i < n; i++) labels.push({ dataUrl: url, code });
    }
    setPrinting(false);
    printLabelSheetA4(labels);
  };

  const toggleAll = (on: boolean) => {
    const next: Record<string, boolean> = {};
    filtered.forEach(r => { if (value(r).trim()) next[r.key] = on; });
    setSelected(next);
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Barcode className="w-5 h-5 text-primary" /> Barcode Management
          <Badge variant="outline">{assigned}/{rows.length} assigned</Badge>
          <Badge variant="outline">{totalSelectedLabels} labels selected</Badge>
        </CardTitle>
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search product, variant or barcode…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Code length</Label>
            <Input type="number" min={6} max={24} value={codeLength} onChange={e => setCodeLength(e.target.value)} className="h-10 w-20" />
          </div>
          <Button variant="outline" onClick={autoGenerateBlanks} className="h-10">
            <Wand2 className="w-4 h-4 mr-2" /> Auto-generate blanks
          </Button>
          <Button variant="outline" onClick={printSelectedSheet} disabled={printing} className="h-10">
            <Printer className="w-4 h-4 mr-2" /> {printing ? 'Preparing…' : 'Print selected on A4'}
          </Button>
          <Button onClick={saveAll} disabled={saving} className="h-10">
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save all'}
          </Button>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>Select all</Button>
          <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>Clear selection</Button>
          <span className="text-muted-foreground">Set copies per label, e.g. label 1 x 5 copies, label 3 x 3 copies.</span>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No products yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(r => {
              const v = value(r);
              const dupe = !!v.trim() && duplicates.has(v.trim());
              const preview = v.trim() ? barcodeDataUrl(v.trim(), { width: 2, height: 110 }) : '';
              const isPending = !!v.trim() && v.trim() !== (r.barcode || '').trim();
              return (
                <div key={r.key} className={`rounded-lg border p-3 space-y-2 bg-card ${r.variantId ? 'ml-0 md:ml-4 border-dashed' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <Checkbox
                        checked={!!selected[r.key]}
                        onCheckedChange={(c) => setSelected(p => ({ ...p, [r.key]: !!c }))}
                        disabled={!v.trim()}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.variantId ? `Variant ${r.label}${r.price ? ` · ₹${r.price}` : ''}` : r.label}
                        </p>
                      </div>
                    </div>
                    {isPending ? <Badge className="bg-yellow-500 text-white shrink-0">Pending</Badge>
                      : r.barcode ? <Badge className="bg-green-500 text-white shrink-0">Assigned</Badge>
                      : <Badge variant="outline" className="shrink-0">No barcode</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={v}
                      placeholder="Scan or type barcode"
                      onChange={e => setEdits(p => ({ ...p, [r.key]: e.target.value }))}
                      className={`h-10 font-mono ${dupe ? 'border-destructive' : ''}`}
                    />
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Scan" onClick={() => setScanFor(r.key)}>
                      <ScanLine className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Generate" onClick={() => setEdits(p => ({ ...p, [r.key]: genBarcode(parseInt(codeLength) || 12, r.name) }))}>
                      <Wand2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" className="h-10 w-10 shrink-0" title="Save" onClick={() => saveOne(r)}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                  {dupe && <p className="text-[11px] text-destructive">This barcode is already used.</p>}
                  {preview && (
                    <div className="space-y-2">
                      <div className="rounded-md bg-white p-3 flex items-center justify-center">
                        <img src={preview} alt={`Barcode ${v}`} className="w-full max-w-[420px] h-auto" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Label className="text-xs">Copies</Label>
                          <Input
                            type="number"
                            min={1}
                            value={copies[r.key] ?? 1}
                            onChange={e => setCopies(p => ({ ...p, [r.key]: parseInt(e.target.value) || 1 }))}
                            className="h-8 w-16"
                          />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => downloadLabel(r)}>
                          <Download className="w-4 h-4 mr-1" /> Label PNG
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => printOne(r)}>
                          <Printer className="w-4 h-4 mr-1" /> Print 1"x2.5"
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <BarcodeScannerDialog
        open={!!scanFor}
        onOpenChange={(o) => { if (!o) setScanFor(null); }}
        onScan={(code) => {
          if (scanFor) setEdits(p => ({ ...p, [scanFor]: code.trim() }));
          setScanFor(null);
        }}
      />
    </Card>
  );
};

export default BarcodeTabNew;