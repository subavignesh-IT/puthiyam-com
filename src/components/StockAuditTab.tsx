import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Activity, Download, RefreshCw, Radio } from 'lucide-react';

interface AuditRow {
  id: string;
  product_name: string | null;
  variant_label: string | null;
  change_qty: number;
  stock_before: number | null;
  stock_after: number | null;
  reason: string;
  order_number: string | null;
  sale_channel: string | null;
  created_at: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const StockAuditTab: React.FC<{ sellerId: string; isAdmin?: boolean }> = ({ sellerId, isAdmin }) => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [live, setLive] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('stock_audit_log')
      .select('id, product_name, variant_label, change_qty, stock_before, stock_after, reason, order_number, sale_channel, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!isAdmin) q = q.eq('seller_id', sellerId);
    if (from) q = q.gte('created_at', new Date(from).toISOString());
    if (to) q = q.lte('created_at', new Date(`${to}T23:59:59`).toISOString());
    const { data, error } = await q;
    if (error) toast({ title: 'Could not load the stock log', description: error.message, variant: 'destructive' });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sellerId, isAdmin, from, to]);

  useEffect(() => {
    const channel = supabase
      .channel('stock-audit-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_audit_log' }, (payload) => {
        const row = payload.new as any;
        if (!isAdmin && row.seller_id !== sellerId) return;
        setRows(prev => [row as AuditRow, ...prev].slice(0, 500));
        setLive(true);
        setTimeout(() => setLive(false), 2500);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sellerId, isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      (r.product_name || '').toLowerCase().includes(q) ||
      (r.order_number || '').toLowerCase().includes(q));
  }, [rows, search]);

  const exportCsv = () => {
    const head = ['Time', 'Product', 'Variant', 'Change', 'Before', 'After', 'Reason', 'Order', 'Channel'];
    const body = filtered.map(r => [
      fmt(r.created_at), r.product_name || '', r.variant_label || '', r.change_qty,
      r.stock_before ?? '', r.stock_after ?? '', r.reason, r.order_number || '', r.sale_channel || '',
    ]);
    const csv = [head, ...body].map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Stock Audit Log
          <Badge variant={live ? 'default' : 'outline'} className="ml-1 gap-1">
            <Radio className={`w-3 h-3 ${live ? 'animate-pulse' : ''}`} /> Live
          </Badge>
        </CardTitle>
        <div className="grid grid-cols-2 md:flex gap-2">
          <Input placeholder="Search product or bill…" value={search} onChange={e => setSearch(e.target.value)} className="h-10 md:flex-1 col-span-2" />
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-10" aria-label="From date" />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-10" aria-label="To date" />
          <Button variant="outline" className="h-10" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" className="h-10" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading stock activity…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No stock changes recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Variant</th>
                  <th className="py-2 pr-3 text-right">Change</th>
                  <th className="py-2 pr-3 text-right">Stock</th>
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">Bill</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-2 pr-3 whitespace-nowrap">{fmt(r.created_at)}</td>
                    <td className="py-2 pr-3 font-medium">{r.product_name || '—'}</td>
                    <td className="py-2 pr-3">{r.variant_label || '—'}</td>
                    <td className={`py-2 pr-3 text-right font-semibold ${r.change_qty < 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {r.change_qty > 0 ? `+${r.change_qty}` : r.change_qty}
                    </td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">
                      {r.stock_before ?? '—'} → <span className="font-medium">{r.stock_after ?? '—'}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline" className="capitalize">{r.reason}</Badge>
                      {r.sale_channel ? <span className="ml-1 text-xs text-muted-foreground">{r.sale_channel}</span> : null}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.order_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockAuditTab;