import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useCustomerDefaults } from '@/hooks/useCustomerDefaults';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Phone, CreditCard, Banknote, Share2, Download, MessageCircle } from 'lucide-react';
import QRCodePayment from './QRCodePayment';
import CheckoutBillImage from './CheckoutBillImage';
import { generateOrderId, getOrderIdForDisplay } from '@/utils/orderIdGenerator';
import { sendBillToCustomer, buildThankYouMessage } from '@/lib/billDelivery';
import { decrementStock } from '@/lib/stock';

const CheckoutForm: React.FC = () => {
  const { items, getTotal, getShippingCost, clearCart, getItemEffectivePrice } = useCart();
  const { user } = useAuth();
  const { defaults, loading: defaultsLoading, updateDefaults } = useCustomerDefaults();
  const [deliveryType, setDeliveryType] = useState<'shipping' | 'self-pickup'>('self-pickup');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [generatedOrderId, setGeneratedOrderId] = useState('');
  const billRef = useRef<HTMLDivElement>(null);
  const [billImageUrl, setBillImageUrl] = useState<string | null>(null);
  const [loyaltyCoupon, setLoyaltyCoupon] = useState<{ code: string; stamps: number } | null>(null);

  // Check for applied loyalty coupon
  useEffect(() => {
    const stored = localStorage.getItem('loyaltyCoupon');
    if (stored) {
      try { setLoyaltyCoupon(JSON.parse(stored)); } catch {}
    }
  }, []);

  // Load customer defaults when available
  useEffect(() => {
    if (!defaultsLoading && defaults) {
      setFormData({
        name: defaults.name || '',
        phone: defaults.phone || '',
        address: defaults.address || '',
      });
    }
  }, [defaults, defaultsLoading]);

  const subtotal = getTotal();
  const shippingCost = deliveryType === 'shipping' ? getShippingCost() : 0;
  const grandTotal = subtotal + shippingCost;
  const homeDeliveryPreview = getShippingCost();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const getTodayOrderCount = async (): Promise<number> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (error) return 0;
    return count || 0;
  };

  const saveOrderToDatabase = async (isPaid: boolean) => {
    if (!user) return null;

    try {
      // Get today's order count for order ID generation
      const todayOrderCount = await getTodayOrderCount();
      const orderId = generateOrderId(todayOrderCount);
      setGeneratedOrderId(orderId);

      const orderData: Record<string, any> = {
        user_id: user.id,
        customer_name: (formData.name && formData.name.trim()) || 'Customer',
        customer_phone: formData.phone,
        customer_address: deliveryType === 'shipping' ? formData.address : null,
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'online' ? 'paid' : 'pending',
        payment_state: paymentMethod === 'online' ? 'paid' : 'pay_later',
        order_status: 'pending',
        courier_name: deliveryType === 'shipping' ? 'Home Delivery' : null,
        order_number: orderId,
        items: items.map(item => {
          const effPrice = getItemEffectivePrice(item);
          return {
            id: item.id,
            name: item.name,
            price: effPrice,
            quantity: item.quantity,
            selectedVariant: item.selectedVariant ? { weight: item.selectedVariant.weight, price: effPrice } : undefined,
          };
        }) as unknown as import('@/integrations/supabase/types').Json,
        subtotal: subtotal,
        shipping_cost: shippingCost,
        total: grandTotal,
      };

      // If loyalty coupon was claimed, store it on the order
      if (loyaltyCoupon) {
        orderData.loyalty_coupon_code = loyaltyCoupon.code;
      }

      const { data: insertedOrder, error } = await supabase.from('orders').insert([orderData] as any).select('id').single();
      if (error) {
        console.error('Error saving order:', error);
        return null;
      }

      // Link loyalty claim to the order
      if (loyaltyCoupon && insertedOrder) {
        await supabase
          .from('loyalty_claims')
          .update({ order_id: insertedOrder.id, is_redeemed: true } as any)
          .eq('coupon_code', loyaltyCoupon.code)
          .eq('user_id', user!.id);
      }

      // Update inventory for the purchased variants
      await updateInventory();

      return orderId;
    } catch (error) {
      console.error('Error saving order:', error);
      return null;
    }
  };

  const generateBillImage = async (): Promise<string | null> => {
    await new Promise(resolve => setTimeout(resolve, 100));

    if (billRef.current) {
      try {
        const canvas = await html2canvas(billRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
        });
        return canvas.toDataURL('image/png');
      } catch (error) {
        console.error('Error generating bill image:', error);
      }
    }
    return null;
  };

  /** Reduces stock for each purchased variant (skipped for unlimited-stock products). */
  const updateInventory = async () => {
    try {
      const productIds = Array.from(new Set(items.map(i => i.id)));
      if (!productIds.length) return;
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, product_id, quantity')
        .in('product_id', productIds);
      const lines = items.map(item => {
        const label = item.selectedVariant?.weight || '';
        const num = parseFloat(label);
        const match = (variants as any[] || []).find(
          v => v.product_id === item.id && (isNaN(num) ? true : Number(v.quantity) === num)
        );
        return { variantId: match?.id, quantity: item.quantity };
      });
      await decrementStock(lines);
    } catch (e) {
      console.error('Inventory update failed', e);
    }
  };

  /** Sends the bill + thank-you message to the customer automatically (WhatsApp → SMS fallback). */
  const autoSendBillToCustomer = async (orderId: string, imageUrl: string | null) => {
    const res = await sendBillToCustomer({
      phone: formData.phone,
      message: buildThankYouMessage({
        orderNumber: orderId,
        customerName: formData.name || 'Customer',
        total: grandTotal,
        paid: paymentMethod === 'online',
      }),
      imageDataUrl: imageUrl,
      orderNumber: orderId,
    });
    if (res.channel === 'whatsapp') {
      toast({ title: 'Bill sent on WhatsApp', description: 'A thank-you message with the bill was delivered.' });
    } else if (res.channel === 'sms') {
      toast({ title: 'Bill sent by SMS', description: 'WhatsApp delivery failed, so we texted the bill link.' });
    } else {
      toast({ title: 'Automatic bill send failed', description: 'Use the Share Bill button to send it manually.', variant: 'destructive' });
    }
  };

  const downloadBill = async () => {
    const imageUrl = billImageUrl || await generateBillImage();
    if (imageUrl) {
      const link = document.createElement('a');
      link.download = `PUTHIYAM_Bill_${generatedOrderId || Date.now()}.png`;
      link.href = imageUrl;
      link.click();
    }
  };

  const persistLastOrder = (imageUrl: string | null) => {
    if (!imageUrl) return;
    try {
      localStorage.setItem('lastOrderBill', JSON.stringify({
        orderId: generatedOrderId || `${Date.now()}`,
        imageUrl,
        timestamp: Date.now(),
      }));
      window.dispatchEvent(new Event('lastOrderBill:update'));
    } catch (e) {
      console.error('persistLastOrder failed', e);
    }
  };

  // Seller's WhatsApp number where the bill image should land
  const SELLER_WHATSAPP = '919361284773';

  const buildShareText = (orderId: string) =>
    `New PUTHIYAM Order ${orderId}\n` +
    `Customer: ${formData.name} (${formData.phone})\n` +
    `${deliveryType === 'shipping' ? 'Delivery: ' + formData.address : 'Self Pickup'}\n` +
    `Payment: ${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online (UPI)'}\n` +
    `Total: ₹${grandTotal}`;

  const shareImageToWhatsApp = async (_toSeller: boolean = false) => {
    const imageUrl = billImageUrl || await generateBillImage();
    if (!imageUrl) return;
    const orderId = generatedOrderId || `${Date.now()}`;
    const text = buildShareText(orderId);

    // Convert PNG data URL to JPG for smaller size + WhatsApp friendliness
    let jpgUrl = imageUrl;
    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise((res) => { img.onload = res; });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        jpgUrl = canvas.toDataURL('image/jpeg', 0.92);
      }
    } catch {}

    // Always download the bill image (JPG)
    const link = document.createElement('a');
    link.download = `PUTHIYAM_Bill_${orderId}.jpg`;
    link.href = jpgUrl;
    link.click();

    // Open WhatsApp chat with seller, pre-filled with order details
    const waUrl = `https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent(text + '\n\n(Bill image saved to your device — please attach it here.)')}`;
    window.open(waUrl, '_blank');

    // Try native share sheet too (mobile) so the image can be sent directly
    try {
      const res = await fetch(jpgUrl);
      const blob = await res.blob();
      const file = new File([blob], `PUTHIYAM_Bill_${orderId}.jpg`, { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `PUTHIYAM Bill - ${orderId}`,
          text,
        });
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handlePaymentSuccess = async () => {
    setPaymentComplete(true);
    setShowQR(false);

    // Save order to database
    await saveOrderToDatabase(true);

    // Update customer defaults for next order
    updateDefaults({
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
    });

    // Generate bill image
    const imageUrl = await generateBillImage();
    setBillImageUrl(imageUrl);

    // Download bill automatically
    if (imageUrl) {
      const link = document.createElement('a');
      link.download = `PUTHIYAM_Bill_${generatedOrderId}.png`;
      link.href = imageUrl;
      link.click();
    }

    // Auto-open WhatsApp share so the bill is ready to send to seller
    await shareImageToWhatsApp(true);

    // Persist last order for 5-min download banner on cart
    persistLastOrder(imageUrl);

    // Clear cart and loyalty coupon
    localStorage.removeItem('loyaltyCoupon');
    clearCart();
  };

  const handleCODOrder = async () => {
    setPaymentComplete(true);

    // Save order to database
    await saveOrderToDatabase(false);

    // Update customer defaults for next order
    updateDefaults({
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
    });

    // Generate bill image
    const imageUrl = await generateBillImage();
    setBillImageUrl(imageUrl);

    // Download bill automatically
    if (imageUrl) {
      const link = document.createElement('a');
      link.download = `PUTHIYAM_Bill_${generatedOrderId}.png`;
      link.href = imageUrl;
      link.click();
    }

    // Auto-open WhatsApp share so the bill is ready to send to seller
    await shareImageToWhatsApp(true);

    // Persist last order for 5-min download banner on cart
    persistLastOrder(imageUrl);

    // Clear cart and loyalty coupon
    localStorage.removeItem('loyaltyCoupon');
    clearCart();
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.phone.trim() || !/^\d{10}$/.test(formData.phone)) {
      toast({
        title: "Valid Phone Required",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive"
      });
      return false;
    }
    if (deliveryType === 'shipping' && !formData.address.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter your delivery address for shipping",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleProceed = () => {
    if (!validateForm()) return;

    if (paymentMethod === 'cod') {
      handleCODOrder();
    } else {
      setShowQR(true);
    }
  };

  if (items.length === 0 && !paymentComplete) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-muted-foreground">Your cart is empty</p>
        </CardContent>
      </Card>
    );
  }

  if (paymentComplete) {
    return (
      <>
        <Card className="text-center py-12 animate-fade-in">
          <CardContent className="space-y-4">
            <div className="w-20 h-20 mx-auto bg-secondary/20 rounded-full flex items-center justify-center">
              <span className="text-4xl">🎉</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">Thank You!</h2>
            <p className="text-muted-foreground">
              Order ID: <strong>{generatedOrderId}</strong>
            </p>
            <p className="text-muted-foreground">
              Your bill has been downloaded. Share it via WhatsApp if needed.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button onClick={downloadBill} variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Bill Again
              </Button>
              <Button onClick={() => shareImageToWhatsApp()} variant="outline" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Share Bill
              </Button>
            </div>
            <Button onClick={() => window.location.href = '/'} className="gradient-hero text-primary-foreground">
              Continue Shopping
            </Button>
          </CardContent>
        </Card>

      </>
    );
  }

  const handlePaymentTimeout = () => {
    setShowQR(false);
    toast({
      title: "Payment Timeout",
      description: "Your order has been cancelled due to payment timeout. Please try again.",
      variant: "destructive",
      duration: 5000,
    });
  };

  if (showQR) {
    return (
      <QRCodePayment
        total={grandTotal}
        onPaymentComplete={handlePaymentSuccess}
        onBack={() => setShowQR(false)}
        onTimeout={handlePaymentTimeout}
      />
    );
  }

  return (
    <>
      {/* Hidden Bill Image for Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <CheckoutBillImage
          ref={billRef}
          orderId={generatedOrderId}
          customerName={formData.name}
          customerPhone={formData.phone}
          customerAddress={deliveryType === 'shipping' ? formData.address : null}
          deliveryType={deliveryType}
          paymentMethod={paymentMethod}
          paymentStatus={paymentMethod === 'online' ? 'paid' : 'pending'}
          items={items}
          subtotal={subtotal}
          shippingCost={shippingCost}
          total={grandTotal}
          loyaltyCoupon={loyaltyCoupon}
        />
      </div>

      <Card className="animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif">Checkout</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('tel:9361284773')}
            className="flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Contact Us
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Rajesh Kumar"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="e.g. 9876543210"
                maxLength={10}
                required
              />
            </div>
          </div>

          {/* Delivery Type */}
          <div className="space-y-3">
            <Label>Delivery Method</Label>
            <RadioGroup
              value={deliveryType}
              onValueChange={(value) => setDeliveryType(value as 'shipping' | 'self-pickup')}
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary transition-colors">
                <RadioGroupItem value="self-pickup" id="self-pickup" />
                <Label htmlFor="self-pickup" className="flex-1 cursor-pointer">
                  <span className="font-medium">Self Pickup</span>
                  <span className="block text-sm text-muted-foreground">Pick up from our store</span>
                </Label>
                <span className="text-secondary font-medium">FREE</span>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary transition-colors">
                <RadioGroupItem value="shipping" id="shipping" />
                <Label htmlFor="shipping" className="flex-1 cursor-pointer">
                  <span className="font-medium">Home Delivery</span>
                  <span className="block text-sm text-muted-foreground">Delivered to your address</span>
                </Label>
                <span className={homeDeliveryPreview === 0 ? 'text-secondary font-medium' : 'text-muted-foreground'}>
                  {homeDeliveryPreview === 0 ? 'FREE' : `₹${homeDeliveryPreview}`}
                </span>
              </div>
            </RadioGroup>
          </div>

          {/* Address (only for shipping) */}
          {deliveryType === 'shipping' && (
            <div className="animate-fade-in">
              <Label htmlFor="address">Delivery Address *</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="e.g. 123, Main Street, Near Bus Stand, Chennai - 600001"
                rows={3}
                required
              />
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as 'online' | 'cod')}
            >
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary transition-colors">
                <RadioGroupItem value="online" id="online" />
                <Label htmlFor="online" className="flex-1 cursor-pointer">
                  <span className="font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Online Payment (UPI)
                  </span>
                  <span className="block text-sm text-muted-foreground">Pay now via GPay, PhonePe, Paytm, etc.</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary transition-colors">
                <RadioGroupItem value="cod" id="cod" />
                <Label htmlFor="cod" className="flex-1 cursor-pointer">
                  <span className="font-medium flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    Cash on Delivery
                  </span>
                  <span className="block text-sm text-muted-foreground">Pay when you receive the order</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            {deliveryType === 'shipping' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className={shippingCost === 0 ? 'text-secondary' : ''}>
                  {shippingCost === 0 ? 'FREE' : `₹${shippingCost}`}
                </span>
              </div>
            )}
            <div className="border-t border-border pt-2 flex justify-between font-semibold">
              <span>Grand Total</span>
              <span className="text-primary">₹{grandTotal}</span>
            </div>
            {subtotal < 200 && deliveryType === 'shipping' && (
              <p className="text-xs text-muted-foreground">
                Add ₹{200 - subtotal} more for free shipping!
              </p>
            )}
          </div>

          <Button
            onClick={handleProceed}
            className="w-full gradient-hero text-primary-foreground text-lg py-6"
          >
            {paymentMethod === 'cod' ? 'Place Order (Pay on Delivery)' : 'Proceed to Payment'}
          </Button>
        </CardContent>
      </Card>
    </>
  );
};

export default CheckoutForm;
