import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Phone, CreditCard, Banknote } from 'lucide-react';
import QRCodePayment from './QRCodePayment';

const CheckoutForm: React.FC = () => {
  const { items, getTotal, getShippingCost, clearCart } = useCart();
  const [deliveryType, setDeliveryType] = useState<'shipping' | 'self-pickup'>('self-pickup');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const subtotal = getTotal();
  const shippingCost = deliveryType === 'shipping' ? getShippingCost() : 0;
  const grandTotal = subtotal + shippingCost;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const formatOrderMessage = (isPaid: boolean) => {
    const itemsText = items.map(item => 
      `• ${item.name}: ₹${item.price} × ${item.quantity} = ₹${item.price * item.quantity}`
    ).join('\n');

    const paymentStatus = isPaid 
      ? '✅ Payment Status: PAID' 
      : '⏳ Payment Status: NOT PAID (Cash on Delivery)';

    return `🛒 *New Order from PUTHIYAM PRODUCTS*

👤 *Customer Details:*
Name: ${formData.name}
Phone: ${formData.phone}
${deliveryType === 'shipping' ? `Address: ${formData.address}` : 'Delivery: Self Pickup'}

📦 *Order Details:*
${itemsText}

💰 *Bill Summary:*
Subtotal: ₹${subtotal}
${deliveryType === 'shipping' ? `Shipping: ₹${shippingCost}${subtotal >= 200 ? ' (FREE!)' : ''}` : ''}
*Grand Total: ₹${grandTotal}*

${paymentStatus}`;
  };

  const sendWhatsAppMessage = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/919361284773?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePaymentSuccess = () => {
    setPaymentComplete(true);
    setShowQR(false);

    // Send WhatsApp message (online payment = PAID)
    const message = formatOrderMessage(true);
    sendWhatsAppMessage(message);

    // Show thank you toast
    toast({
      title: "🎉 Thank You!",
      description: "Your order has been placed successfully. You'll receive a confirmation shortly.",
      duration: 5000,
    });

    // Clear cart
    clearCart();
  };

  const handleCODOrder = () => {
    setPaymentComplete(true);

    // Send WhatsApp message (COD = NOT PAID)
    const message = formatOrderMessage(false);
    sendWhatsAppMessage(message);

    // Show thank you toast
    toast({
      title: "🎉 Order Placed!",
      description: "Your COD order has been placed. Pay when you receive the order.",
      duration: 5000,
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

  if (showQR) {
    return (
      <QRCodePayment
        total={grandTotal}
        onPaymentComplete={handlePaymentSuccess}
        onBack={() => setShowQR(false)}
      />
    );
  }

  return (
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
              placeholder="Enter your full name"
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
              placeholder="10-digit phone number"
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
              placeholder="Enter your complete delivery address"
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
  );
};

export default CheckoutForm;
