import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw } from 'lucide-react';

interface OTPVerificationProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({ phone, onVerified, onBack }) => {
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Generate and "send" OTP (simulated - in production would use MSG91)
  const generateOTP = () => {
    const newOTP = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOTP(newOTP);
    
    // In production, this would call MSG91 API to send SMS
    // For now, show the OTP in a toast (development only)
    toast({
      title: "OTP Sent!",
      description: `Your OTP is: ${newOTP} (SMS sent to ${phone})`,
      duration: 15000,
    });

    // Reset resend timer
    setResendTimer(30);
    setCanResend(false);
  };

  useEffect(() => {
    generateOTP();
  }, []);

  useEffect(() => {
    if (resendTimer > 0 && !canResend) {
      const timer = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer, canResend]);

  const handleVerify = () => {
    if (otp.length !== 4) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 4-digit OTP",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Verify OTP
    setTimeout(() => {
      if (otp === generatedOTP) {
        toast({
          title: "Verified!",
          description: "Phone number verified successfully",
        });
        onVerified();
      } else {
        toast({
          title: "Invalid OTP",
          description: "The OTP you entered is incorrect. Please try again.",
          variant: "destructive"
        });
        setOtp('');
      }
      setLoading(false);
    }, 500);
  };

  const handleResend = () => {
    if (canResend) {
      generateOTP();
    }
  };

  return (
    <Card className="w-full max-w-md shadow-elevated animate-fade-in">
      <CardHeader className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 gradient-hero rounded-full flex items-center justify-center">
          <span className="text-primary-foreground font-serif font-bold text-2xl">P</span>
        </div>
        <CardTitle className="font-serif text-2xl">Verify OTP</CardTitle>
        <CardDescription>
          Enter the 4-digit code sent to <strong>{phone}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            maxLength={4}
            value={otp}
            onChange={setOtp}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          onClick={handleVerify}
          className="w-full gradient-hero text-primary-foreground"
          disabled={loading || otp.length !== 4}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify OTP'
          )}
        </Button>

        <div className="text-center">
          {canResend ? (
            <Button variant="ghost" onClick={handleResend} className="text-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Resend OTP
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Resend OTP in {resendTimer}s
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full text-muted-foreground"
        >
          ← Back to Login
        </Button>
      </CardContent>
    </Card>
  );
};

export default OTPVerification;
