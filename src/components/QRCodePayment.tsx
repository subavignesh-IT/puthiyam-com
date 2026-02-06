import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Smartphone, QrCode, Copy, Check, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface QRCodePaymentProps {
  total: number;
  onPaymentComplete: () => void;
  onBack: () => void;
  onTimeout: () => void;
}

const QRCodePayment: React.FC<QRCodePaymentProps> = ({ total, onPaymentComplete, onBack, onTimeout }) => {
  const upiId = 'kathaiahkarthik@okhdfcbank';
  const merchantName = 'PUTHIYAM PRODUCTS';
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${total}&cu=INR`;
  
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [copied, setCopied] = useState(false);
  const [payerUpi, setPayerUpi] = useState('');
  const [paymentRequested, setPaymentRequested] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [upiAppOpened, setUpiAppOpened] = useState(false);
  const returnCheckRef = useRef<number | null>(null);
  
  // Generate QR code using QR Server API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeout]);

  // Listen for visibility change to detect when user returns from UPI app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && upiAppOpened) {
        // User returned to the page after opening UPI app
        // Show confirmation dialog after a short delay
        if (returnCheckRef.current) {
          clearTimeout(returnCheckRef.current);
        }
        returnCheckRef.current = window.setTimeout(() => {
          setShowConfirmDialog(true);
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (returnCheckRef.current) {
        clearTimeout(returnCheckRef.current);
      }
    };
  }, [upiAppOpened]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenUpiApp = useCallback(() => {
    setUpiAppOpened(true);
    // Try to open UPI deep link
    window.location.href = upiUrl;
  }, [upiUrl]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast({
      title: "UPI ID Copied!",
      description: "Paste this in your UPI app to pay",
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendPaymentRequest = () => {
    if (!payerUpi.trim() || !payerUpi.includes('@')) {
      toast({
        title: "Invalid UPI Address",
        description: "Please enter a valid UPI address (e.g., name@upi)",
        variant: "destructive"
      });
      return;
    }

    // In a real implementation, this would call a backend API to send collect request
    setPaymentRequested(true);
    toast({
      title: "Payment Request Sent!",
      description: `A payment request for ₹${total} has been sent to ${payerUpi}. Please approve it in your UPI app.`,
      duration: 8000,
    });
    
    // Start listening for return after user opens their UPI app
    setUpiAppOpened(true);
  };

  const handlePaymentConfirmed = () => {
    setShowConfirmDialog(false);
    onPaymentComplete();
  };

  const handlePaymentNotCompleted = () => {
    setShowConfirmDialog(false);
    toast({
      title: "Payment Not Completed",
      description: "Please complete the payment in your UPI app and try again.",
      variant: "destructive"
    });
  };

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader>
          <Button variant="ghost" size="sm" onClick={onBack} className="w-fit -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <CardTitle className="font-serif text-center">Complete Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer */}
          <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
            timeRemaining < 120 ? 'bg-destructive/10 text-destructive' : 'bg-muted'
          }`}>
            <Clock className="w-5 h-5" />
            <span className="font-medium">Time remaining: {formatTime(timeRemaining)}</span>
          </div>

          {timeRemaining < 120 && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Order will be cancelled if payment is not completed in time</span>
            </div>
          )}

          <div className="text-center">
            <p className="text-muted-foreground mb-2">Amount to Pay</p>
            <p className="text-3xl font-bold text-primary">₹{total}</p>
          </div>

          {/* Option 1: Open UPI App Directly */}
          <div className="space-y-3">
            <Button 
              onClick={handleOpenUpiApp}
              className="w-full gradient-hero text-primary-foreground py-6 text-lg"
            >
              <Smartphone className="w-5 h-5 mr-2" />
              Pay with UPI App
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Opens GPay, PhonePe, Paytm, or other UPI apps
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or scan QR code</span>
            </div>
          </div>

          {/* Option 2: QR Code */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-card p-4 rounded-lg shadow-soft border border-border">
              <img
                src={qrCodeUrl}
                alt="UPI Payment QR Code"
                className="w-48 h-48"
              />
            </div>
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Scan with any UPI app</span>
            </div>
          </div>

          {/* UPI ID Copy */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">UPI ID</p>
                <p className="font-mono font-medium">{upiId}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyUpi}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or enter your UPI</span>
            </div>
          </div>

          {/* Option 3: Enter UPI Address for Collect Request */}
          <div className="space-y-3">
            <Label htmlFor="payerUpi">Your UPI Address</Label>
            <div className="flex gap-2">
              <Input
                id="payerUpi"
                value={payerUpi}
                onChange={(e) => setPayerUpi(e.target.value)}
                placeholder="yourname@upi"
                disabled={paymentRequested}
              />
              <Button 
                onClick={handleSendPaymentRequest}
                disabled={paymentRequested || !payerUpi.trim()}
                variant="outline"
              >
                {paymentRequested ? 'Sent!' : 'Request'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              We'll send a payment request to your UPI app
            </p>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            After completing payment, your order will be confirmed via WhatsApp
          </p>
        </CardContent>
      </Card>

      {/* Payment Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Did you complete the payment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              If you've successfully paid ₹{total} using your UPI app, click "Yes, Payment Done" to confirm your order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handlePaymentNotCompleted}>
              No, Still Processing
            </AlertDialogCancel>
            <AlertDialogAction onClick={handlePaymentConfirmed} className="gradient-hero">
              Yes, Payment Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default QRCodePayment;
