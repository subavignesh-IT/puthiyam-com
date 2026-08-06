import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import POSBilling from '@/components/POSBilling';

const POS: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      if (loading) return;
      if (!user) { navigate('/login'); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const roles = (data || []).map((r: any) => r.role);
      const ok = roles.includes('seller') || roles.includes('admin');
      setAllowed(ok);
      if (!ok) navigate('/');
    };
    check();
  }, [user, loading, navigate]);

  if (allowed !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading POS…</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="px-3 py-2 border-b bg-card flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/seller')} aria-label="Back to dashboard">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" /> POS Billing
        </h1>
        <Badge variant="outline" className="ml-1">Offline sale</Badge>
      </header>
      <div className="flex-1 overflow-hidden">
        {user && <POSBilling sellerId={user.id} />}
      </div>
    </div>
  );
};

export default POS;
