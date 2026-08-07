import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Barcode, Save, Wand2, ScanLine, Search, Printer, Download } from 'lucide-react';
import BarcodeScannerDialog from '@/components/BarcodeScannerDialog';
import { barcodeDataUrl, labelDataUrlAsync, printLabels } from '@/lib/barcodeImage';

interface Row { id: string; name: string; category: string; barcode: string | null }

const genBarcode = () => `PP${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;

const BarcodeTab: React.FC<{ sellerId: string }> = ({ sellerId }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [scanFor, setScanFor] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, category, barcode')
      .eq('seller_id', sellerId)
      .order('name');
    setRows((data as any) || []);
    setEdits({});
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sellerId]);

  const value = (r: Row) => edits[r.id] ?? (r.barcode || '');

  const duplicates = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => {
      const v = (edits[r.id] ?? r.barcode ?? '').trim();
      if (v) counts[v] = (counts[v] || 0) + 1;
    });
    return new Set(Object.keys(counts).filter(k => counts[k] > 1));
  }, [rows, edits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.name.toLowerCase().includes(q) || (r.barcode || '').toLowerCase().includes(q));
  }, [rows, search]);

  const saveOne = async (r: Row) => {
    const v = value(r).trim();
    if (v && duplicates.has(v)) {
      toast({ title: 'Duplicate barcode', description: `${v} is already used by another product`, variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('products').update({ barcode: v || null } as any).eq('id', r.id);
    if (error) { toast({ title: 'Could not save barcode', description: error.message, variant: 'destructive' }); return; }
    setRows(prev => prev.map(p => p.id === r.id ? { ...p, barcode: v || null } : p));
    setEdits(prev => { const n = { ...prev }; delete n[r.id]; return n; });
    toast({ title: `Barcode saved for ${r.name}` });
  };

  const autoGenerateBlanks = () => {
    const next = { ...edits };
    rows.forEach(r => { if (!value(r).trim()) next[r.id] = genBarcode(); });
    setEdits(next);
    toast({ title: 'Barcodes generated', description: 'Review, then press Save all' });
  };

  const saveAll = async () => {
    const changed = rows.filter(r => edits[r.id] !== undefined);
    if (!changed.length) { toast({ title: 'Nothing to save' }); return; }
    const dupe = changed.find(r => duplicates.has(value(r).trim()));
    if (dupe) { toast({ title: 'Duplicate barcodes found', description: 'Fix duplicates before saving', variant: 'destructive' }); return; }
    setSaving(true);
    for (const r of changed) {
      const v = value(r).trim();
      const { error } = await supabase.from('products').update({ barcode: v || null } as any).eq('id', r.id);
      if (error) { toast({ title: `Failed for ${r.name}`, description: error.message, variant: 'destructive' }); }
    }
    setSaving(false);
    await load();
    toast({ title: 'Barcodes updated' });
  };

  const assigned = rows.filter(r => (r.barcode || '').trim()).length;

  const downloadLabel = async (r: Row) => {
    const code = value(r).trim();
    if (!code) { toast({ title: 'Add a barcode first', variant: 'destructive' }); return; }
    const url = await labelDataUrlAsync(code, r.name);
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
    const url = await labelDataUrlAsync(code, r.name);
    if (url) printLabels([{ dataUrl: url, code }]);
  };

  const printAllAssigned = async () => {
    const withCodes = filtered.filter(r => value(r).trim());
    if (!withCodes.length) { toast({ title: 'No barcodes to print' }); return; }
    setPrinting(true);
    const labels: { dataUrl: string; code: string }[] = [];
    for (const r of withCodes) {
      const code = value(r).trim();
      const url = await labelDataUrlAsync(code, r.name);
      if (url) labels.push({ dataUrl: url, code });
    }
    setPrinting(false);
    printLabels(labels);
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2">
          <Barcode className="w-5 h-5 text-primary" /> Barcode Management
          <Badge variant="outline" className="ml-1">{assigned}/{rows.length} assigned</Badge>
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search product or barcode…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" />
          </div>
          <Button variant="outline" onClick={autoGenerateBlanks} className="h-10">
            <Wand2 className="w-4 h-4 mr-2" /> Auto-generate blanks
          </Button>
          <Button variant="outline" onClick={printAllAssigned} disabled={printing} className="h-10">
            <Printer className="w-4 h-4 mr-2" /> {printing ? 'Preparing…' : 'Print all labels'}
          </Button>
          <Button onClick={saveAll} disabled={saving} className="h-10">
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving…' : 'Save all'}
          </Button>
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
              const preview = v.trim() ? barcodeDataUrl(v.trim(), { width: 2, height: 90 }) : '';
              return (
                <div key={r.id} className="rounded-lg border p-3 space-y-2 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.category}</p>
                    </div>
                    {r.barcode ? <Badge className="bg-green-500 text-white shrink-0">Assigned</Badge>
                      : <Badge variant="outline" className="shrink-0">No barcode</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={v}
                      placeholder="Scan or type barcode"
                      onChange={e => setEdits(p => ({ ...p, [r.id]: e.target.value }))}
                      className={`h-10 font-mono ${dupe ? 'border-destructive' : ''}`}
                    />
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Scan" onClick={() => setScanFor(r.id)}>
                      <ScanLine className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Generate" onClick={() => setEdits(p => ({ ...p, [r.id]: genBarcode() }))}>
                      <Wand2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" className="h-10 w-10 shrink-0" title="Save" onClick={() => saveOne(r)}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                  {dupe && <p className="text-[11px] text-destructive">This barcode is already used by another product.</p>}
                  {preview && (
                    <div className="space-y-2">
                      <div className="rounded-md bg-white p-3 flex items-center justify-center">
                        <img src={preview} alt={`Barcode ${v}`} className="w-full max-w-[320px] h-auto" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadLabel(r)}>
                          <Download className="w-4 h-4 mr-1" /> Label PNG
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => printOne(r)}>
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

export default BarcodeTab;
