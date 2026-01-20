import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import QRCodePayment from './QRCodePayment';

const CheckoutForm: React.FC = () => {
  const { items, getTotal, getShippingCost, clearCart } = useCart();
  const [deliveryType, setDeliveryType] = useState<'shipping' | 'self-pickup'>('self-pickup');
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

  const formatOrderMessage = () => {
    const itemsText = items.map(item => 
      `• ${item.name}: ₹${item.price} × ${item.quantity} = ₹${item.price * item.quantity}`
    ).join('\n');

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

✅ Payment Status: PAID`;
  };

  const sendWhatsAppMessage = (message: string) => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/919361284773?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePaymentSuccess = () => {
    setPaymentComplete(true);
    setShowQR(false);

    // Send WhatsApp message
    const message = formatOrderMessage();
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

  const handleProceedToPayment = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive"
      });
      return;
    }
    if (!formData.phone.trim() || !/^\d{10}$/.test(formData.phone)) {
      toast({
        title: "Valid Phone Required",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive"
      });
      return;
    }
    if (deliveryType === 'shipping' && !formData.address.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter your delivery address for shipping",
        variant: "destructive"
      });
      return;
    }
    setShowQR(true);
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
      <CardHeader>
        <CardTitle className="font-serif">Checkout</CardTitle>
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
          onClick={handleProceedToPayment}
          className="w-full gradient-hero text-primary-foreground text-lg py-6"
        >
          Proceed to Payment
        </Button>
      </CardContent>
    </Card>
  );
};

export default CheckoutForm;
