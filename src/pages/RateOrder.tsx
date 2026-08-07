import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Loader2, CheckCircle2, PackageCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

interface OrderItemLine {
  id?: string;
  productId?: string;
  product_id?: string;
  name: string;
  quantity: number;
  image?: string;
}

interface RatingOrder {
  id: string;
  order_number: string;
  customer_name: string;
  created_at: string;
  items: OrderItemLine[];
}

const StarRow: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map(n => (
      <button
        key={n}
        type="button"
        aria-label={`${n} star`}
        onClick={() => onChange(n)}
        className="p-1 transition-transform duration-200 hover:scale-125 active:scale-95"
      >
        <Star className={`w-7 h-7 ${n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
      </button>
    ))}
  </div>
);

const RateOrder: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<RatingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!orderId) { setLoading(false); return; }
      const { data, error } = await supabase.rpc('get_order_for_rating', { _order_id: orderId } as any);
      if (error || !data) { setLoading(false); return; }
      const o = data as any as RatingOrder;
      setOrder({ ...o, items: Array.isArray(o.items) ? o.items : [] });
      setName(o.customer_name || '');
      setLoading(false);
    };
    load();
  }, [orderId]);

  const lines = useMemo(() => {
    if (!order) return [] as { key: string; productId: string | null; name: string; quantity: number; image?: string }[];
    return order.items.map((it, i) => ({
      key: `${it.productId || it.product_id || it.id || i}-${i}`,
      productId: (it.productId || it.product_id || it.id) ?? null,
      name: it.name,
      quantity: it.quantity,
      image: it.image,
    }));
  }, [order]);

  const submit = async () => {
    if (!orderId) return;
    const rated = lines.filter(l => ratings[l.key] > 0);
    if (!rated.length) {
      toast({ title: 'Pick at least one star', description: 'Rate any item to submit your feedback.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    let failures = 0;
    for (const l of rated) {
      const { error } = await supabase.rpc('submit_pos_feedback', {
        _order_id: orderId,
        _product_id: l.productId,
        _rating: ratings[l.key],
        _comment: comments[l.key] || null,
        _customer_name: name || null,
        _customer_phone: phone || null,
      } as any);
      if (error) failures++;
    }
    setSubmitting(false);
    if (failures === rated.length) {
      toast({ title: 'Could not save your rating', description: 'Please try again in a moment.', variant: 'destructive' });
      return;
    }
    setDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="text-2xl font-serif font-bold">Order not found</h1>
        <p className="text-muted-foreground">This rating link is invalid or has expired.</p>
        <Button asChild><Link to="/">Back to shop</Link></Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center animate-fade-in">
        <CheckCircle2 className="w-16 h-16 text-green-500 animate-scale-in" />
        <h1 className="text-2xl font-serif font-bold">Thank you for your feedback!</h1>
        <p className="text-muted-foreground">Your rating helps PUTHIYAM PRODUCTS serve you better.</p>
        <Button asChild><Link to="/">Continue shopping</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
        <header className="text-center space-y-2">
          <div className="w-14 h-14 gradient-hero rounded-full flex items-center justify-center mx-auto shadow-soft">
            <span className="text-primary-foreground font-serif font-bold text-2xl">P</span>
          </div>
          <h1 className="text-2xl font-serif font-bold">Rate your order</h1>
          <p className="text-muted-foreground text-sm">
            Order {order.order_number || order.id.slice(0, 8)} ·{' '}
            {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </header>

        {lines.map(l => (
          <Card key={l.key} className="hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-base">
                {l.image ? (
                  <img src={l.image} alt={l.name} loading="lazy" className="w-12 h-12 rounded-md object-cover" />
                ) : (
                  <span className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                    <PackageCheck className="w-5 h-5 text-muted-foreground" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate">{l.name}</span>
                  <span className="block text-xs text-muted-foreground font-normal">Qty {l.quantity}</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StarRow value={ratings[l.key] || 0} onChange={v => setRatings(p => ({ ...p, [l.key]: v }))} />
              <Textarea
                placeholder="Tell us about this product (optional)"
                value={comments[l.key] || ''}
                onChange={e => setComments(p => ({ ...p, [l.key]: e.target.value }))}
                rows={2}
              />
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
          </CardContent>
        </Card>

        <Button className="w-full h-12 text-base" onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Star className="w-5 h-5 mr-2" />}
          Submit rating
        </Button>
      </div>
    </div>
  );
};

export default RateOrder;
