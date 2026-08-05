import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Minus, Trash2, Download, Share2, Store, QrCode, Search, UserPlus,
  ShoppingCart, X, Maximize2, Truck, Receipt, ScanLine, Package, User as UserIcon,
} from 'lucide-react';
import { generateOrderId } from '@/utils/orderIdGenerator';
import { toJpeg } from 'html-to-image';
import OrderBillImage from '@/components/OrderBillImage';
import BarcodeScannerDialog from '@/components/BarcodeScannerDialog';

/** Fallback UPI ID used for POS money transactions when the seller has none saved. */
const DEFAULT_UPI_ID = 'kathaiahkarthik@okhdfcbank';

interface POSTabProps {
  sellerId: string;
}

interface Variant { id: string; quantity: number; price: number; is_default?: boolean | null; }
interface WholesaleTier { min_quantity: number; price: number; }
interface ProductLite {
  id: string;
  name: string;
  category: string;
  base_price: number;
  image?: string;
  variants: Variant[];
  wholesale: WholesaleTier[];
  delivery_charge?: number;
  free_delivery_quantity?: number;
}
interface CartLine {
  productId: string;
  name: string;
  variant?: Variant;
  quantity: number;
  unitPrice: number;        // original
  effectivePrice: number;   // after wholesale
  wholesaleApplied?: number;
  deliveryCharge?: number;
  freeDeliveryQty?: number;
}
interface POSCustomer { id: string; name: string; phone: string; address?: string | null; }

// Pick default variant: is_default=true first, else lowest price
const pickDefaultVariant = (variants: Variant[]): Variant | undefined => {
  if (!variants.length) return undefined;
  const d = variants.find(v => v.is_default);
  if (d) return d;
  return [...variants].sort((a, b) => a.price - b.price)[0];
};

// Compute effective price with wholesale tiers
const applyWholesale = (unit: number, qty: number, tiers: WholesaleTier[]) => {
  if (!tiers?.length) return { price: unit };
  const sorted = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);
  const hit = sorted.find(t => qty >= t.min_quantity);
  return hit ? { price: hit.price, wholesale: hit.price } : { price: unit };
};

const POSTab: React.FC<POSTabProps> = ({ sellerId }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  // Customer
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [savedCustomers, setSavedCustomers] = useState<POSCustomer[]>([]);
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '' });
  const [custSearch, setCustSearch] = useState('');

  // Delivery
  const [deliveryType, setDeliveryType] = useState<'self-pickup' | 'shipping'>('self-pickup');
  const [manualCourier, setManualCourier] = useState<string>('');

  // Payment
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [upiId, setUpiId] = useState(DEFAULT_UPI_ID);
  const [sellerName, setSellerName] = useState('PUTHIYAM');

  const [saving, setSaving] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [tab, setTab] = useState<'product' | 'cart' | 'customer'>('product');
  const [scanOpen, setScanOpen] = useState(false);
  const billRef = useRef<HTMLDivElement>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  // Fetch products, variants, wholesale, seller profile, saved customers
  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: v }, { data: w }, { data: imgs }, { data: prof }, { data: pc }] = await Promise.all([
        supabase.from('products').select('id, name, category, base_price, delivery_charge, free_delivery_quantity').eq('seller_id', sellerId).eq('is_active', true),
        supabase.from('product_variants').select('id, product_id, quantity, price, is_default'),
        supabase.from('product_wholesale_tiers').select('product_id, min_quantity, price'),
        supabase.from('product_images').select('product_id, image_url, is_primary'),
        supabase.from('profiles').select('upi_id, full_name').eq('user_id', sellerId).maybeSingle(),
        supabase.from('pos_customers' as any).select('id, name, phone, address').eq('seller_id', sellerId).order('created_at', { ascending: false }),
      ]);

      const list: ProductLite[] = ((p as any[]) || []).map((pr) => {
        const img = ((imgs as any[]) || []).find(i => i.product_id === pr.id && i.is_primary) || ((imgs as any[]) || []).find(i => i.product_id === pr.id);
        return {
          id: pr.id,
          name: pr.name,
          category: pr.category,
          base_price: pr.base_price,
          image: img?.image_url,
          delivery_charge: pr.delivery_charge,
          free_delivery_quantity: pr.free_delivery_quantity,
          variants: ((v as any[]) || []).filter(vv => vv.product_id === pr.id),
          wholesale: ((w as any[]) || []).filter(ww => ww.product_id === pr.id),
        };
      });
      setProducts(list);
      if ((prof as any)?.upi_id) setUpiId((prof as any).upi_id);
      if ((prof as any)?.full_name) setSellerName((prof as any).full_name || 'PUTHIYAM');
      if (Array.isArray(pc)) setSavedCustomers(pc as any);
    })();
  }, [sellerId]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
  }, [products, search]);

  const addProductToCart = (p: ProductLite, variant?: Variant) => {
    const v = variant || pickDefaultVariant(p.variants);
    const unit = v?.price ?? p.base_price;
    // If same line already exists, bump qty
    const idx = cart.findIndex(l => l.productId === p.id && (l.variant?.id ?? null) === (v?.id ?? null));
    if (idx >= 0) {
      updateQty(idx, cart[idx].quantity + 1);
      return;
    }
    const line: CartLine = {
      productId: p.id,
      name: p.name,
      variant: v,
      quantity: 1,
      unitPrice: unit,
      effectivePrice: unit,
      deliveryCharge: p.delivery_charge || 0,
      freeDeliveryQty: p.free_delivery_quantity || 0,
    };
    const ws = applyWholesale(unit, 1, p.wholesale);
    line.effectivePrice = ws.price;
    line.wholesaleApplied = ws.wholesale;
    setCart(prev => [...prev, line]);
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty < 1) return removeLine(idx);
    setCart(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const p = products.find(pp => pp.id === l.productId);
      const ws = applyWholesale(l.unitPrice, qty, p?.wholesale || []);
      return { ...l, quantity: qty, effectivePrice: ws.price, wholesaleApplied: ws.wholesale };
    }));
  };

  const removeLine = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.effectivePrice * l.quantity, 0), [cart]);

  const autoCourier = useMemo(() => {
    if (deliveryType !== 'shipping') return 0;
    // per product delivery charge; waive if any line's qty >= freeDeliveryQty
    let total = 0;
    for (const l of cart) {
      const free = l.freeDeliveryQty && l.freeDeliveryQty > 0 && l.quantity >= l.freeDeliveryQty;
      if (!free) total += l.deliveryCharge || 0;
    }
    // shipping min ₹100 rule under ₹200 (memory)
    if (subtotal < 200 && total === 0) total = 100;
    return total;
  }, [cart, deliveryType, subtotal]);

  const shippingCost = manualCourier !== '' ? Math.max(0, Number(manualCourier) || 0) : autoCourier;
  const grandTotal = subtotal + shippingCost;

  // UPI URL + QR
  const upiPayUrl = useMemo(() => {
    if (!upiId || grandTotal <= 0) return '';
    const params = new URLSearchParams({
      pa: upiId, pn: sellerName || 'PUTHIYAM', am: grandTotal.toFixed(2), cu: 'INR', tn: `POS-${Date.now()}`,
    });
    return `upi://pay?${params.toString()}`;
  }, [upiId, grandTotal, sellerName]);

  const qrSrc = upiPayUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiPayUrl)}` : '';

  const shareQrImage = async () => {
    if (!qrSrc) return;
    try {
      const res = await fetch(qrSrc);
      const blob = await res.blob();
      const file = new File([blob], `UPI_QR_${grandTotal}.png`, { type: 'image/png' });
      const text = `Pay ₹${grandTotal.toFixed(2)} to ${sellerName} via UPI (${upiId})`;
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, title: 'Payment QR' });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `UPI_QR_${grandTotal}.png`;
        link.click();
        const phone = (customerPhone || '').replace(/\D/g, '');
        window.open(`https://wa.me/${phone.length >= 10 ? phone : ''}?text=${encodeURIComponent(text)}`, '_blank');
      }
    } catch (e) {
      toast({ title: 'Could not share QR', variant: 'destructive' });
    }
  };

  const addPosCustomer = async () => {
    if (!newCust.name.trim() || !newCust.phone.trim()) {
      toast({ title: 'Enter name and phone', variant: 'destructive' }); return;
    }
    const { data, error } = await supabase.from('pos_customers' as any).insert({
      seller_id: sellerId,
      name: newCust.name.trim(),
      phone: newCust.phone.trim(),
      address: newCust.address.trim() || null,
    }).select('id, name, phone, address').single();
    if (error) { toast({ title: 'Failed to save customer', description: error.message, variant: 'destructive' }); return; }
    const c = data as any as POSCustomer;
    setSavedCustomers(prev => [c, ...prev]);
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerAddress(c.address || '');
    setNewCust({ name: '', phone: '', address: '' });
    setAddCustOpen(false);
    toast({ title: 'Customer added' });
  };

  const pickCustomer = (id: string) => {
    if (id === '__walkin__') {
      setCustomerId(null); setCustomerName('Walk-in Customer'); setCustomerPhone(''); setCustomerAddress('');
      return;
    }
    const c = savedCustomers.find(sc => sc.id === id);
    if (!c) return;
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerAddress(c.address || '');
  };

  const resetSession = () => {
    setCart([]);
    setCustomerId(null);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerAddress('');
    setManualCourier('');
    setDeliveryType('self-pickup');
    setStep('cart');
  };

  const buildBillItems = () => cart.map(l => ({
    id: l.productId,
    name: l.name + (l.wholesaleApplied ? ` (Wholesale ₹${l.wholesaleApplied})` : ''),
    price: l.effectivePrice,
    quantity: l.quantity,
    selectedVariant: l.variant ? { weight: `${l.variant.quantity}`, price: l.variant.price } : undefined,
  }));

  const saveOrder = async (): Promise<any | null> => {
    if (cart.length === 0) { toast({ title: 'Cart is empty', variant: 'destructive' }); return null; }
    if (!customerPhone.trim() && customerName === 'Walk-in Customer') {
      // allow walk-in with just phone optional? require at least a phone
      toast({ title: 'Enter customer phone', variant: 'destructive' }); return null;
    }
    if (!user) return null;
    setSaving(true);
    const orderNumber = generateOrderId();
    const payload: any = {
      user_id: user.id,
      order_number: orderNumber,
      customer_name: customerName.trim() || 'Walk-in Customer',
      customer_phone: customerPhone.trim(),
      customer_address: deliveryType === 'shipping' ? (customerAddress.trim() || null) : null,
      delivery_type: deliveryType,
      payment_method: paymentMode === 'upi' ? 'upi' : 'cod',
      payment_status: 'paid',
      order_status: deliveryType === 'shipping' ? 'processing' : 'delivered',
      items: buildBillItems(),
      subtotal,
      shipping_cost: shippingCost,
      total: grandTotal,
      sale_channel: 'offline',
    };
    const { data, error } = await supabase.from('orders').insert([payload]).select('*').single();
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      return null;
    }
    setLastOrder({ ...data, paymentMode });
    toast({ title: 'Offline sale recorded', description: `Order ${orderNumber}` });
    return data;
  };

  const generateJpg = async (): Promise<string | null> => {
    if (!billRef.current) return null;
    try {
      return await toJpeg(billRef.current, { quality: 0.92, backgroundColor: '#ffffff', pixelRatio: 2 });
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const saveAndShare = async () => {
    const order = await saveOrder();
    if (!order) return;
    // Wait a tick so hidden bill renders with latest order
    await new Promise(r => setTimeout(r, 100));
    const dataUrl = await generateJpg();
    if (!dataUrl) return;
    // Download
    const link = document.createElement('a');
    link.download = `POS_Bill_${order.order_number}.jpg`;
    link.href = dataUrl;
    link.click();
    // Web Share
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `POS_Bill_${order.order_number}.jpg`, { type: 'image/jpeg' });
      const phone = (customerPhone || '').replace(/\D/g, '');
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Bill ${order.order_number}`, text: `PUTHIYAM Bill ${order.order_number}` });
      } else if (phone.length >= 10) {
        window.open(`https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(`PUTHIYAM Bill ${order.order_number} — Total ₹${grandTotal.toFixed(2)}`)}`, '_blank');
      }
    } catch {}
    resetSession();
  };

  const downloadOnly = async () => {
    const order = lastOrder || await saveOrder();
    if (!order) return;
    await new Promise(r => setTimeout(r, 100));
    const dataUrl = await generateJpg();
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `POS_Bill_${order.order_number}.jpg`;
    link.href = dataUrl;
    link.click();
  };

  // ============ UI ============
  return (
    <>
      {/* Entry card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" /> POS / Cash Sale
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <p className="text-sm text-muted-foreground">
            Vyapar-style full-screen billing: product search, default variants, wholesale pricing, courier & UPI QR.
          </p>
          <Button size="lg" className="gradient-hero text-primary-foreground" onClick={() => setOpen(true)}>
            <Maximize2 className="w-4 h-4 mr-2" /> Open POS
          </Button>
        </CardContent>
      </Card>

      {lastOrder && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Last Sale — {lastOrder.order_number}
              <Badge className="ml-2 bg-green-500 text-white">Offline</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadOnly}>
              <Download className="w-4 h-4 mr-2" /> Download JPG Bill
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Full-screen POS dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="p-0 gap-0 max-w-none w-screen h-screen sm:rounded-none border-0 bg-background overflow-hidden"
          style={{ maxHeight: '100vh' }}
        >
          <DialogHeader className="px-4 py-3 border-b bg-card flex-row items-center justify-between space-y-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Store className="w-5 h-5 text-primary" /> POS Billing
              <Badge variant="outline" className="ml-2">Offline</Badge>
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] h-[calc(100vh-56px)] overflow-hidden">
            {/* LEFT: search + product grid */}
            <div className="flex flex-col border-r bg-muted/20 overflow-hidden">
              <div className="p-3 border-b bg-card sticky top-0 z-10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Search products by name or category…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 text-base"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {filteredProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No products found</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 items-stretch">
                    {filteredProducts.map((p) => {
                      const dv = pickDefaultVariant(p.variants);
                      const price = dv?.price ?? p.base_price;
                      return (
                        <button
                          key={p.id}
                          onClick={() => addProductToCart(p)}
                          className="group flex flex-col h-full text-left rounded-lg border bg-card hover:border-primary hover:shadow-md active:scale-[0.98] transition overflow-hidden"
                        >
                          <div className="aspect-square bg-muted overflow-hidden">
                            {p.image ? (
                              <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                            )}
                          </div>
                          <div className="p-2 flex-1 flex flex-col justify-between gap-1">
                            <p className="text-sm font-medium line-clamp-2 leading-tight">{p.name}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-primary">₹{price}</span>
                              {dv && <span className="text-[10px] text-muted-foreground">{dv.quantity}</span>}
                            </div>
                            {p.variants.length > 1 && (
                              <div onClick={(e) => e.stopPropagation()}>
                                <Select onValueChange={(vid) => {
                                  const vv = p.variants.find(x => x.id === vid);
                                  if (vv) addProductToCart(p, vv);
                                }}>
                                  <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="+ variant" /></SelectTrigger>
                                  <SelectContent>
                                    {p.variants.map(vv => (
                                      <SelectItem key={vv.id} value={vv.id}>{vv.quantity} — ₹{vv.price}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: cart / bill */}
            <div className="flex flex-col bg-card overflow-hidden">
              {/* Step indicator */}
              <div className="px-3 py-2 border-b bg-card flex items-center gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full transition ${step === 'cart' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                >
                  <span className="w-4 h-4 rounded-full bg-background/30 flex items-center justify-center text-[10px]">1</span>
                  Cart
                </button>
                <span className="text-muted-foreground">→</span>
                <button
                  type="button"
                  onClick={() => cart.length > 0 && setStep('checkout')}
                  disabled={cart.length === 0}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full transition ${step === 'checkout' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'} disabled:opacity-50`}
                >
                  <span className="w-4 h-4 rounded-full bg-background/30 flex items-center justify-center text-[10px]">2</span>
                  Customer & Payment
                </button>
                <span className="ml-auto text-muted-foreground tabular-nums">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* STEP 1: CART */}
              {step === 'cart' && (
                <>
                  <div className="flex-1 overflow-y-auto p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" /> Cart ({cart.length})
                      </span>
                      {cart.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setCart([])}>
                          Clear
                        </Button>
                      )}
                    </div>
                    {cart.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-10">
                        Tap a product on the left to add it.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cart.map((l, i) => (
                          <div key={i} className="rounded-lg border p-2 bg-background">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{l.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {l.variant ? `${l.variant.quantity} • ` : ''}
                                  ₹{l.effectivePrice}
                                  {l.wholesaleApplied && (
                                    <span className="ml-1 text-green-600 font-medium">(wholesale)</span>
                                  )}
                                </p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeLine(i)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(i, l.quantity - 1)}>
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min={1}
                                  value={l.quantity}
                                  onChange={(e) => updateQty(i, parseInt(e.target.value) || 1)}
                                  className="h-7 w-14 text-center text-sm"
                                />
                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(i, l.quantity + 1)}>
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                              <span className="text-sm font-bold tabular-nums">₹{(l.effectivePrice * l.quantity).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="border-t p-3 space-y-2 bg-muted/20">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Subtotal</span>
                      <span className="text-primary tabular-nums">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <Button
                      className="w-full gradient-hero text-primary-foreground h-11"
                      disabled={cart.length === 0}
                      onClick={() => setStep('checkout')}
                    >
                      Next: Customer & Payment →
                    </Button>
                  </div>
                </>
              )}

              {/* STEP 2: CHECKOUT */}
              {step === 'checkout' && (
                <>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {/* Customer */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Customer</Label>
                      <div className="flex gap-2">
                        <Select value={customerId || '__walkin__'} onValueChange={pickCustomer}>
                          <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__walkin__">Walk-in Customer</SelectItem>
                            {savedCustomers.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="outline" onClick={() => setAddCustOpen(true)} title="Add customer">
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-10 text-sm" />
                        <Input placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-10 text-sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Truck className="w-3 h-3" /> Delivery</Label>
                        <Select value={deliveryType} onValueChange={(v) => setDeliveryType(v as any)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="self-pickup">Self Pickup</SelectItem>
                            <SelectItem value="shipping">Home Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Courier ₹ (override)</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder={`${autoCourier}`}
                          value={manualCourier}
                          onChange={e => setManualCourier(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    {deliveryType === 'shipping' && (
                      <Input placeholder="Delivery address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="h-9 text-sm" />
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Payment</Label>
                        <Select value={paymentMode} onValueChange={v => setPaymentMode(v as any)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="upi">UPI (QR)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {paymentMode === 'upi' && (
                        <div>
                          <Label className="text-[11px] text-muted-foreground">UPI ID</Label>
                          <Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="you@upi" className="h-9 text-sm" />
                        </div>
                      )}
                    </div>

                    {paymentMode === 'upi' && upiId && grandTotal > 0 && (
                      <div ref={qrWrapRef} className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-background">
                        <QrCode className="w-4 h-4 text-primary" />
                        <img src={qrSrc} alt="UPI QR" className="w-44 h-44" />
                        <p className="text-xs text-muted-foreground">Scan to pay ₹{grandTotal.toFixed(2)}</p>
                        <Button variant="outline" size="sm" onClick={shareQrImage}>
                          <Share2 className="w-3 h-3 mr-1" /> Send QR
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="border-t p-3 space-y-3 bg-muted/20">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">₹{subtotal.toFixed(2)}</span></div>
                      {shippingCost > 0 && (
                        <div className="flex justify-between text-muted-foreground"><span>Courier</span><span className="tabular-nums">₹{shippingCost.toFixed(2)}</span></div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-1 border-t">
                        <span>TOTAL</span><span className="text-primary tabular-nums">₹{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => setStep('cart')} className="h-11">
                        ← Back to Cart
                      </Button>
                      <Button
                        className="gradient-hero text-primary-foreground h-11"
                        disabled={saving || cart.length === 0}
                        onClick={saveAndShare}
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        {saving ? 'Saving…' : 'Save & Share'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add customer dialog */}
      <Dialog open={addCustOpen} onOpenChange={setAddCustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={newCust.name} onChange={e => setNewCust(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={newCust.phone} onChange={e => setNewCust(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Address (optional)</Label>
              <Input value={newCust.address} onChange={e => setNewCust(p => ({ ...p, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCustOpen(false)}>Cancel</Button>
            <Button onClick={addPosCustomer}>Save Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden bill for JPG capture (off-screen) */}
      <div style={{ position: 'fixed', top: -99999, left: -99999, pointerEvents: 'none', opacity: 0 }}>
        <OrderBillImage
          ref={billRef}
          orderId={lastOrder?.order_number || 'DRAFT'}
          customerName={customerName}
          customerPhone={customerPhone}
          customerAddress={deliveryType === 'shipping' ? customerAddress : null}
          deliveryType={deliveryType}
          paymentMethod={paymentMode === 'upi' ? 'upi' : 'cod'}
          paymentStatus="paid"
          orderStatus={deliveryType === 'shipping' ? 'processing' : 'delivered'}
          items={buildBillItems()}
          subtotal={subtotal}
          shippingCost={shippingCost}
          total={grandTotal}
          createdAt={new Date().toISOString()}
        />
      </div>
    </>
  );
};

export default POSTab;