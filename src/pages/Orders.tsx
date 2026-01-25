import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import BillImage from '@/components/BillImage';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { Package, Calendar, MapPin, Phone, CreditCard, Truck, Trash2, RefreshCw, Share2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingOrderId, setSharingOrderId] = useState<string | null>(null);
  const billRef = useRef<HTMLDivElement>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.filter(order => order.id !== orderId));
      toast({
        title: "Order Deleted",
        description: "The order has been removed from your history.",
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error",
        description: "Failed to delete order. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReorder = (order: Order) => {
    order.items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        addToCart({
          id: item.id,
          name: item.name,
          price: item.price,
          image: '/placeholder.svg',
          category: 'Reorder',
          description: '',
          rating: 0,
          reviewCount: 0,
        });
      }
    });

    toast({
      title: "Items Added to Cart",
      description: `${order.items.length} item(s) from your previous order have been added to cart.`,
    });
    navigate('/cart');
  };

  const handleShareBill = async (order: Order) => {
    setSelectedOrder(order);
    setSharingOrderId(order.id);

    // Wait for the bill to render
    await new Promise(resolve => setTimeout(resolve, 100));

    if (billRef.current) {
      try {
        const canvas = await html2canvas(billRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
        });
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            // Try to share via Web Share API if available
            if (navigator.share && navigator.canShare) {
              const file = new File([blob], `puthiyam-order-${order.id.slice(0, 8)}.png`, { type: 'image/png' });
              
              if (navigator.canShare({ files: [file] })) {
                try {
                  await navigator.share({
                    files: [file],
                    title: 'PUTHIYAM Order Bill',
                    text: `Order bill from PUTHIYAM PRODUCTS - Total: ₹${order.total}`,
                  });
                  setSharingOrderId(null);
                  setSelectedOrder(null);
                  return;
                } catch (e) {
                  console.log('Share cancelled or failed, falling back to WhatsApp');
                }
              }
            }

            // Fallback: Download and open WhatsApp
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `puthiyam-order-${order.id.slice(0, 8)}.png`;
            link.click();
            URL.revokeObjectURL(url);

            toast({
              title: "Bill Downloaded!",
              description: "Opening WhatsApp... Please attach the downloaded image.",
            });

            // Open WhatsApp with a simple message
            const message = encodeURIComponent(
              `🛒 Order Bill from PUTHIYAM PRODUCTS\n\n📦 Order Total: ₹${order.total}\n📅 Date: ${formatDate(order.created_at)}\n\n(Bill image attached)`
            );
            window.open(`https://wa.me/919361284773?text=${message}`, '_blank');
          }
          setSharingOrderId(null);
          setSelectedOrder(null);
        }, 'image/png');
      } catch (error) {
        console.error('Error generating bill image:', error);
        toast({
          title: "Error",
          description: "Failed to generate bill image. Please try again.",
          variant: "destructive"
        });
        setSharingOrderId(null);
        setSelectedOrder(null);
      }
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

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(order)}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Re-order
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShareBill(order)}
                      disabled={sharingOrderId === order.id}
                      className="flex items-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      {sharingOrderId === order.id ? 'Generating...' : 'Share Bill'}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this order from your history. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteOrder(order.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Hidden Bill Image for Screenshot */}
      {selectedOrder && (
        <div className="fixed left-[-9999px] top-0">
          <BillImage
            ref={billRef}
            customerName={selectedOrder.customer_name}
            customerPhone={selectedOrder.customer_phone}
            customerAddress={selectedOrder.customer_address || undefined}
            deliveryType={selectedOrder.delivery_type}
            paymentMethod={selectedOrder.payment_method}
            paymentStatus={selectedOrder.payment_status}
            items={selectedOrder.items}
            subtotal={selectedOrder.subtotal}
            shippingCost={selectedOrder.shipping_cost}
            total={selectedOrder.total}
            orderDate={selectedOrder.created_at}
          />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Orders;
