import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Calendar, MapPin, Phone, CreditCard, Truck } from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  delivery_type: string;
  payment_method: string;
  payment_status: string;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  created_at: string;
}

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      fetchOrders();
    }
  }, [user, authLoading, navigate]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse items from JSONB
      const parsedOrders = (data || []).map(order => ({
        ...order,
        items: order.items as unknown as OrderItem[]
      }));
      
      setOrders(parsedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-pulse text-muted-foreground">Loading orders...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <div className="gradient-hero rounded-2xl p-8 text-primary-foreground text-center">
            <h1 className="font-serif text-3xl font-bold mb-2 animate-fade-in">
              My Orders
            </h1>
            <p className="opacity-90">View your order history</p>
          </div>
        </section>

        {orders.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="font-serif text-xl font-semibold mb-2">No Orders Yet</h2>
              <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
              <Button onClick={() => navigate('/')} className="gradient-hero text-primary-foreground">
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="shadow-soft animate-fade-in">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {order.payment_status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                      </Badge>
                      <Badge variant="outline">
                        {order.delivery_type === 'shipping' ? 'Delivery' : 'Self Pickup'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Info */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{order.customer_phone}</span>
                    </div>
                    {order.customer_address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">{order.customer_address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {order.payment_method === 'online' ? (
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Truck className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span>{order.payment_method === 'online' ? 'Online Payment' : 'COD'}</span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span className="font-medium">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    {order.shipping_cost > 0 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Shipping</span>
                        <span>₹{order.shipping_cost}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary">₹{order.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Orders;
