import React from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QRCodePaymentProps {
  total: number;
  onPaymentComplete: () => void;
  onBack: () => void;
}

const QRCodePayment: React.FC<QRCodePaymentProps> = ({ total, onPaymentComplete, onBack }) => {
  const upiId = 'kathaiahkarthik@okhdfcbank';
  const upiUrl = `upi://pay?pa=${upiId}&pn=PUTHIYAM%20PRODUCTS&am=${total}&cu=INR`;
  
  // Generate QR code using Google Charts API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <Button variant="ghost" size="sm" onClick={onBack} className="w-fit -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <CardTitle className="font-serif text-center">Complete Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Amount to Pay</p>
          <p className="text-3xl font-bold text-primary">₹{total}</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="bg-card p-4 rounded-lg shadow-soft border border-border">
            <img
              src={qrCodeUrl}
              alt="UPI Payment QR Code"
              className="w-48 h-48"
            />
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Scan with any UPI app</p>
            <p className="text-xs text-muted-foreground mt-1">or pay to: <span className="font-mono">{upiId}</span></p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">How to pay:</h4>
          <ol className="text-sm text-muted-foreground space-y-1">
            <li>1. Open any UPI app (GPay, PhonePe, Paytm, etc.)</li>
            <li>2. Scan the QR code above</li>
            <li>3. Enter the amount: ₹{total}</li>
            <li>4. Complete the payment</li>
            <li>5. Click "I've Completed Payment" below</li>
          </ol>
        </div>

        <Button
          onClick={onPaymentComplete}
          className="w-full gradient-hero text-primary-foreground text-lg py-6"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          I've Completed Payment
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          After clicking, your order will be confirmed via WhatsApp
        </p>
      </CardContent>
    </Card>
  );
};

export default QRCodePayment;
