import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, Eye, EyeOff, User, Phone, Store, Building2, MapPin, Receipt } from 'lucide-react';

const SellerSignup: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    gstin: '',
    businessAddress: '',
    city: '',
    pincode: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (!formData.companyName || !formData.businessAddress || !formData.city || !formData.pincode) {
      toast({
        title: "Company Details Required",
        description: "Shop/company name, address, city and pincode are required for admin approval",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
          }
        }
      });

      if (authError) {
        setLoading(false);
        toast({
          title: "Signup Failed",
          description: authError.message,
          variant: "destructive"
        });
        return;
      }

      if (!authData.user) {
        setLoading(false);
        toast({
          title: "Signup Failed",
          description: "Could not create account. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // 2. Create the seller access request server-side (works even before email confirmation)
      const { data: reqData, error: reqError } = await supabase.functions.invoke('seller-request', {
        body: {
          user_id: authData.user.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          shop_name: formData.companyName,
          company_name: formData.companyName,
          gstin: formData.gstin,
          business_address: formData.businessAddress,
          city: formData.city,
          pincode: formData.pincode,
        },
      });

      if (reqError || (reqData as any)?.error) {
        setLoading(false);
        toast({
          title: "Request Not Submitted",
          description: (reqData as any)?.error || reqError?.message || 'Could not send your seller request. Please try again.',
          variant: "destructive",
        });
        return;
      }

      // 3. Notify admin via WhatsApp (opens on user's device)
      try {
        const msg = encodeURIComponent(
          `New seller request on PUTHIYAM PRODUCTS\n\nName: ${formData.fullName}\nCompany: ${formData.companyName}\nGSTIN: ${formData.gstin || '-'}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nAddress: ${formData.businessAddress}, ${formData.city} - ${formData.pincode}\n\nApprove in Admin Dashboard.`
        );
        window.open(`https://wa.me/919361284773?text=${msg}`, '_blank');
      } catch {}

      setLoading(false);
      toast({
        title: "Request Submitted!",
        description: "Your seller request is pending admin approval. You'll be notified once approved.",
      });
      navigate('/seller-login');
    } catch (error: any) {
      setLoading(false);
      toast({
        title: "Signup Failed",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-elevated animate-fade-in">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <Store className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="font-serif text-2xl">Become a Seller</CardTitle>
            <CardDescription>Register as a seller on PUTHIYAM PRODUCTS</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="e.g. Rajesh Kumar"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g. seller@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="e.g. ••••••••"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t space-y-4">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Company Details
                  <span className="text-xs font-normal text-muted-foreground">(required for approval)</span>
                </p>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Shop / Company Name</Label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="e.g. Puthiyam Traders" className="pl-10" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN (optional)</Label>
                  <div className="relative">
                    <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="gstin" name="gstin" value={formData.gstin} onChange={handleInputChange} placeholder="e.g. 33ABCDE1234F1Z5" maxLength={15} className="pl-10 uppercase font-mono" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="businessAddress" name="businessAddress" value={formData.businessAddress} onChange={handleInputChange} placeholder="Street, area" className="pl-10" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">City / District</Label>
                    <Input id="city" name="city" value={formData.city} onChange={handleInputChange} placeholder="e.g. Paramakudi" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" name="pincode" value={formData.pincode} onChange={handleInputChange} placeholder="e.g. 623707" maxLength={6} required />
                  </div>
                </div>
              </div>

              <div className="space-y-2 hidden">
                <Label htmlFor="password-legacy">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password-legacy"
                    name="password-legacy"
                    type={showPassword ? 'text' : 'password'}
                    value=""
                    readOnly
                    placeholder="e.g. ••••••••"
                    className="pl-10 pr-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Re-enter password"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-hero text-primary-foreground"
                disabled={loading}
              >
                {loading ? 'Creating Seller Account...' : 'Register as Seller'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm space-y-2">
              <div>
                <span className="text-muted-foreground">Already a seller? </span>
                <Link to="/seller-login" className="text-primary hover:underline font-medium">
                  Seller Login
                </Link>
              </div>
              <div>
                <span className="text-muted-foreground">Want to buy instead? </span>
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Buyer Signup
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default SellerSignup;
