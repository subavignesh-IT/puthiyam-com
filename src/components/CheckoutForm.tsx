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
import { Phone, CreditCard, Banknote } from 'lucide-react';
import QRCodePayment from './QRCodePayment';
import CheckoutBillImage from './CheckoutBillImage';

const CheckoutForm: React.FC = () => {
  const { items, getTotal, getShippingCost, clearCart } = useCart();
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
  const billRef = useRef<HTMLDivElement>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const saveOrderToDatabase = async (isPaid: boolean) => {
    if (!user) return;

    try {
      const orderData = {
        user_id: user.id,
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_address: deliveryType === 'shipping' ? formData.address : null,
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        // Online payment is 'paid', COD is 'pending' until delivered
        payment_status: paymentMethod === 'online' ? 'paid' : 'pending',
        order_status: 'pending',
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.selectedVariant ? item.selectedVariant.price : item.price,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant ? { weight: item.selectedVariant.weight, price: item.selectedVariant.price } : undefined,
        })) as unknown as import('@/integrations/supabase/types').Json,
        subtotal: subtotal,
        shipping_cost: shippingCost,
        total: grandTotal,
      };

      const { error } = await supabase.from('orders').insert([orderData]);
      if (error) {
        console.error('Error saving order:', error);
      }
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const generateAndShareBill = async (isPaid: boolean) => {
    // Wait for state updates and render
    await new Promise(resolve => setTimeout(resolve, 100));

    if (billRef.current) {
      try {
        const canvas = await html2canvas(billRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
        });
        
        // Download the image
        const link = document.createElement('a');
        link.download = `PUTHIYAM_Bill_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Open WhatsApp with a summary
        const message = `🛒 *New Order from PUTHIYAM PRODUCTS*\n\n👤 Customer: ${formData.name}\n📞 Phone: ${formData.phone}\n💰 Total: ₹${grandTotal}\n${isPaid ? '✅ PAID' : '⏳ COD - PENDING'}\n\n📎 Bill image attached`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/919361284773?text=${encodedMessage}`, '_blank');
      } catch (error) {
        console.error('Error generating bill image:', error);
      }
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

    // Generate bill image and share
    await generateAndShareBill(true);

    // Show thank you toast with SMS info
    const smsContent = `Thank you for your order! Total: ₹${grandTotal}. Your order has been confirmed. - PUTHIYAM PRODUCTS`;
    toast({
      title: "🎉 Thank You!",
      description: (
        <div>
          <p>Your order has been placed successfully.</p>
          <p className="text-xs mt-2 text-muted-foreground">SMS: {smsContent}</p>
        </div>
      ),
      duration: 8000,
    });

    // Clear cart
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

    // Generate bill image and share
    await generateAndShareBill(false);

    // Show thank you toast with SMS info
    const smsContent = `Thank you for your order! Total: ₹${grandTotal} (COD). Pay when you receive. - PUTHIYAM PRODUCTS`;
    toast({
      title: "🎉 Order Placed!",
      description: (
        <div>
          <p>Your COD order has been placed. Pay when you receive the order.</p>
          <p className="text-xs mt-2 text-muted-foreground">SMS: {smsContent}</p>
        </div>
      ),
      duration: 8000,
    });

    // Clear cart
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
      <Card className="text-center py-12 animate-fade-in">
        <CardContent className="space-y-4">
          <div className="w-20 h-20 mx-auto bg-secondary/20 rounded-full flex items-center justify-center">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Thank You!</h2>
          <p className="text-muted-foreground">
            Your order has been placed successfully. Check your WhatsApp for order confirmation.
          </p>
          <Button onClick={() => window.location.href = '/'} className="gradient-hero text-primary-foreground">
            Continue Shopping
          </Button>
        </CardContent>
      </Card>
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
                <span className={subtotal >= 200 ? 'text-secondary font-medium' : 'text-muted-foreground'}>
                  {subtotal >= 200 ? 'FREE' : '₹100'}
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
                  <span className="block text-sm text-muted-foreground">Pay now via UPI QR code</span>
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
