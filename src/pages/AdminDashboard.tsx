import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Trash2, Package, ShoppingCart, Users, Edit, UserCheck, Check, X } from 'lucide-react';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const statusColor = (s: string) => ({
  pending: 'bg-yellow-500', processing: 'bg-blue-500', waiting: 'bg-orange-500',
  shipping: 'bg-purple-500', delivered: 'bg-green-500', cancelled: 'bg-red-500',
}[s] || 'bg-gray-500');

interface Order {
  id: string; order_number?: string | null; user_id: string;
  customer_name: string; customer_phone: string;
  items: any[]; subtotal: number; shipping_cost: number; total: number;
  payment_method: string; payment_status: string; order_status: string;
  created_at: string;
}

interface AdminProduct {
  id: string;
  seller_id: string;
  name: string;
  category: string;
  base_price: number;
  is_in_stock: boolean;
  is_on_sale: boolean;
  discount_amount: number;
  discount_type: string | null;
  image_url?: string | null;
}

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string | null; phone?: string | null; created_at?: string }[]>([]);
  const [loyaltySettingsMap, setLoyaltySettingsMap] = useState<Record<string, { enabled: boolean; stamps_required: number; reward_amount: number; min_order_value: number }>>({});
  const [topTab, setTopTab] = useState<'orders' | 'requests' | 'sellers' | 'products'>('orders');
  const [tab, setTab] = useState('all');
  const [sellerRequests, setSellerRequests] = useState<any[]>([]);
  const [requestSearch, setRequestSearch] = useState('');
  const filteredRequests = React.useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    if (!q) return sellerRequests;
    return sellerRequests.filter((r) =>
      [r.full_name, r.company_name, r.shop_name, r.gstin, r.city, r.pincode, r.business_address, r.phone, r.email]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q))
    );
  }, [sellerRequests, requestSearch]);

  useEffect(() => {
    if (authLoading || adminLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!isAdmin) { navigate('/seller'); return; }
    (async () => {
      const [{ data: o }, { data: p }, { data: pr }, { data: ls }, { data: img }] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('id, seller_id, name, category, base_price, is_in_stock, is_on_sale, discount_amount, discount_type').order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, full_name, phone, created_at'),
        supabase.from('seller_loyalty_settings' as any).select('*'),
        supabase.from('product_images').select('product_id, image_url, display_order').order('display_order'),
      ]);
      setOrders((o as any) || []);
      const firstImage: Record<string, string> = {};
      ((img as any[]) || []).forEach((row) => { if (!firstImage[row.product_id]) firstImage[row.product_id] = row.image_url; });
      setProducts(((p as any[]) || []).map((x) => ({ ...x, image_url: firstImage[x.id] || null })));
      setProfiles((pr as any) || []);
      const map: Record<string, any> = {};
      ((ls as any[]) || []).forEach((s) => { map[s.seller_id] = s; });
      setLoyaltySettingsMap(map);
      const { data: sr } = await supabase.from('seller_requests' as any).select('*').order('created_at', { ascending: false });
      setSellerRequests((sr as any) || []);
    })();
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const sellerGroups = (() => {
    const groups: Record<string, { id: string; name: string; productIds: Set<string> }> = {};
    products.forEach((p) => {
      if (!groups[p.seller_id]) {
        const prof = profiles.find((x) => x.user_id === p.seller_id);
        groups[p.seller_id] = {
          id: p.seller_id,
          name: prof?.full_name || 'Unknown Seller',
          productIds: new Set(),
        };
      }
      groups[p.seller_id].productIds.add(p.id);
    });
    return Object.values(groups).map((g) => {
      const sellerOrders: Order[] = [];
      orders.forEach((o) => {
        const items = (o.items || []).filter((it: any) => g.productIds.has(it.id));
        if (items.length === 0) return;
        const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
        sellerOrders.push({ ...o, items, subtotal, shipping_cost: 0, total: subtotal });
      });
      return { ...g, orders: sellerOrders };
    }).sort((a, b) => b.orders.length - a.orders.length);
  })();

  const updateOrder = async (id: string, field: 'order_status' | 'payment_status', value: string) => {
    const { error } = await supabase.from('orders').update({ [field]: value }).eq('id', id);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, [field]: value } : o));
    toast({ title: 'Updated' });
  };

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    setOrders((prev) => prev.filter((o) => o.id !== id));
    toast({ title: 'Order deleted' });
  };

  const toggleProductStock = async (id: string, val: boolean) => {
    const { error } = await supabase.from('products').update({ is_in_stock: val }).eq('id', id);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, is_in_stock: val } : p));
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: 'Product deleted' });
  };

  const approveSellerRequest = async (req: any) => {
    // Grant seller role
    const { error: roleErr } = await supabase.from('user_roles').insert({ user_id: req.user_id, role: 'seller' as any });
    if (roleErr && !roleErr.message.includes('duplicate')) {
      toast({ title: 'Role assign failed', description: roleErr.message, variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('seller_requests' as any).update({ status: 'approved' }).eq('id', req.id);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    setSellerRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'approved' } : r));
    toast({ title: 'Seller approved' });
    if (req.phone) {
      const msg = encodeURIComponent(`Hi ${req.full_name}, your seller account on PUTHIYAM PRODUCTS has been approved! Login here: ${window.location.origin}/#/seller-login`);
      window.open(`https://wa.me/${req.phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
    }
  };

  const rejectSellerRequest = async (req: any) => {
    const { error } = await supabase.from('seller_requests' as any).update({ status: 'rejected' }).eq('id', req.id);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    setSellerRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'rejected' } : r));
    toast({ title: 'Request rejected' });
  };

  const renderTable = (list: Order[], emptyText = 'No orders yet') => (
    <Card>
      <CardHeader><CardTitle>Orders ({list.length})</CardTitle></CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_number || o.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{o.customer_phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {o.items.map((it: any, i: number) => (
                          <div key={i}>{it.name}{it.selectedVariant && ` (${it.selectedVariant.weight})`} × {it.quantity}</div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">₹{o.total}</TableCell>
                    <TableCell>
                      <Select value={o.payment_status} onValueChange={(v) => updateOrder(o.id, 'payment_status', v)}>
                        <SelectTrigger className="w-24 h-7"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">{o.payment_method}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColor(o.order_status)} text-white`}>{o.order_status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select value={o.order_status} onValueChange={(v) => updateOrder(o.id, 'order_status', v)}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete order?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteOrder(o.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <div className="gradient-hero rounded-2xl p-8 text-primary-foreground text-center">
            <h1 className="font-serif text-3xl font-bold mb-2 animate-fade-in">Admin Dashboard</h1>
            <p className="opacity-90">Cross-seller orders overview</p>
          </div>
        </section>

        <Tabs value={topTab} onValueChange={(v) => setTopTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders" className="flex items-center gap-1 text-xs">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Bills</span>
              <span className="opacity-70">({orders.length})</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1 text-xs">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Seller Requests</span>
              <span className="opacity-70">({sellerRequests.filter((r) => r.status === 'pending').length})</span>
            </TabsTrigger>
            <TabsTrigger value="sellers" className="flex items-center gap-1 text-xs">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Sellers</span>
              <span className="opacity-70">({sellerGroups.length})</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1 text-xs">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Product List</span>
              <span className="opacity-70">({products.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
              <TabsList className="flex flex-wrap h-auto gap-2 justify-start bg-transparent p-0">
                <TabsTrigger value="all" className="rounded-full border border-border bg-card px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All ({orders.length})</TabsTrigger>
                {sellerGroups.map((g) => (
                  <TabsTrigger key={g.id} value={g.id} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs flex items-center gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Store className="w-3 h-3" />
                    {g.name} ({g.orders.length})
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="all">{renderTable(orders)}</TabsContent>
              {sellerGroups.map((g) => (
                <TabsContent key={g.id} value={g.id}>
                  {renderTable(g.orders, `No orders for ${g.name} yet`)}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  Seller Requests ({sellerRequests.length})
                </CardTitle>
                <Input
                  placeholder="Search by name, company, GSTIN, city, phone or email…"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="mt-3 h-10"
                />
              </CardHeader>
              <CardContent>
                {filteredRequests.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    {sellerRequests.length === 0 ? 'No seller requests yet' : 'No requests match your search'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>GSTIN</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.full_name}</TableCell>
                            <TableCell className="text-xs">{r.company_name || r.shop_name || '—'}</TableCell>
                            <TableCell className="text-xs font-mono">{r.gstin || '—'}</TableCell>
                            <TableCell className="text-xs max-w-[200px]">
                              {[r.business_address, r.city, r.pincode].filter(Boolean).join(', ') || '—'}
                            </TableCell>
                            <TableCell className="text-xs">{r.email}</TableCell>
                            <TableCell className="text-xs">{r.phone || '—'}</TableCell>
                            <TableCell>
                              <Badge className={
                                r.status === 'approved' ? 'bg-green-500 text-white' :
                                r.status === 'rejected' ? 'bg-red-500 text-white' :
                                'bg-yellow-500 text-white'
                              }>{r.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                            <TableCell>
                              {r.status === 'pending' && (
                                <div className="flex items-center gap-2">
                                  <Button size="sm" onClick={() => approveSellerRequest(r)} className="h-7">
                                    <Check className="w-3 h-3 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => rejectSellerRequest(r)} className="h-7">
                                    <X className="w-3 h-3 mr-1" /> Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sellers">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              Sellers Overview ({sellerGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sellerGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No sellers yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Loyalty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellerGroups.map((g) => {
                      const profile = profiles.find((p) => p.user_id === g.id);
                      const revenue = g.orders.reduce((s, o) => s + o.total, 0);
                      const ls = loyaltySettingsMap[g.id];
                      return (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.name}</TableCell>
                          <TableCell className="text-sm">{profile?.phone || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}</TableCell>
                          <TableCell>{g.productIds.size}</TableCell>
                          <TableCell>{g.orders.length}</TableCell>
                          <TableCell className="font-semibold text-primary">₹{revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-xs">
                            {ls ? (
                              <span>{ls.enabled ? '✅' : '⏸'} {ls.stamps_required} stamps · ₹{ls.reward_amount} · min ₹{ls.min_order_value}</span>
                            ) : (
                              <span className="text-muted-foreground">Default</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="products">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              All Sellers' Products ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sellerGroups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No seller products</p>
            ) : (
              <div className="space-y-8">
                {sellerGroups.map((g) => {
                  const sellerProds = products.filter((p) => p.seller_id === g.id);
                  if (sellerProds.length === 0) return null;
                  return (
                    <div key={g.id} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-sm px-3 py-1">🏪 {g.name}</Badge>
                        <span className="text-xs text-muted-foreground">({sellerProds.length} products)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {sellerProds.map((product) => (
                          <div key={product.id} className="group flex items-center gap-3 bg-card border rounded-xl p-2 hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 shrink-0 rounded-lg bg-muted overflow-hidden relative">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              {product.is_on_sale && (
                                <Badge variant="destructive" className="absolute top-0.5 right-0.5 text-[9px] px-1">
                                  {product.discount_type === 'percentage' ? `${product.discount_amount}%` : `₹${product.discount_amount}`}
                                </Badge>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              <p className="text-[11px] text-muted-foreground">{product.category}</p>
                              <div className="flex items-center justify-between mt-1.5">
                                <span className="text-sm font-semibold">₹{product.base_price}</span>
                                <div className="flex items-center gap-1.5">
                                  <Switch
                                    checked={product.is_in_stock}
                                    onCheckedChange={(checked) => toggleProductStock(product.id, checked)}
                                    className="scale-75"
                                  />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently remove {product.name}.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteProduct(product.id)}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;