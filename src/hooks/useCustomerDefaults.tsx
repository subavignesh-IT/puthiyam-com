import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CustomerDefaults {
  name: string;
  phone: string;
  address: string;
}

export const useCustomerDefaults = () => {
  const { user } = useAuth();
  const [defaults, setDefaults] = useState<CustomerDefaults>({ name: '', phone: '', address: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLastOrderDetails();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchLastOrderDetails = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // First try to get from user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, address')
        .eq('user_id', user.id)
        .single();

      // Then get the last order for fallback
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, customer_address')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setDefaults({
        name: profile?.full_name || lastOrder?.customer_name || '',
        phone: profile?.phone || lastOrder?.customer_phone || '',
        address: profile?.address || lastOrder?.customer_address || '',
      });
    } catch (error) {
      console.error('Error fetching customer defaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDefaults = async (newDefaults: Partial<CustomerDefaults>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: newDefaults.name,
          phone: newDefaults.phone,
          address: newDefaults.address,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setDefaults(prev => ({ ...prev, ...newDefaults }));
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return { defaults, loading, updateDefaults };
};
