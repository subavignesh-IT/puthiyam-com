import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Package, Plus, Trash2, Upload, ShoppingCart, Edit, Tag, Percent, Settings, Clock, X, Share2, BarChart3, Bell, Download, DollarSign, Users, Gift, Ban, Shield, ShieldCheck, MinusCircle, PlusCircle, Crown, Store, Barcode, Maximize2 } from 'lucide-react';
import { DbProduct, DbProductVariant, DbProductImage } from '@/types/product';
import SalesReportDashboard from '@/components/SalesReportDashboard';
import OrderBillImage from '@/components/OrderBillImage';
import BarcodeTab from '@/components/BarcodeTab';
import { getOrderIdForDisplay } from '@/utils/orderIdGenerator';
import html2canvas from 'html2canvas';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selectedVariant?: { weight: string; price: number };
}

interface Order {
  id: string;
  order_number: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  delivery_type: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  created_at: string;
  user_id: string;
  loyalty_coupon_code?: string | null;
}

interface ProductVariant {
  id?: string;
  quantity: number;
  price: number;
  wholesalePrice: number;
  isDefault: boolean;
  stockQuantity: number;
}

interface ProductWithDetails extends DbProduct {
  variants: DbProductVariant[];
  images: DbProductImage[];
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'processing', label: 'Processing', color: 'bg-blue-500' },
  { value: 'waiting', label: 'Waiting', color: 'bg-orange-500' },
  { value: 'shipping', label: 'Shipping', color: 'bg-purple-500' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'paid', label: 'Paid', color: 'bg-green-500' },
];

interface RequestedProduct {
  id: string;
  user_id: string;
  product_id: string;
  variant_quantity: number | null;
  variant_price: number | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  product?: { name: string };
}

const MEASUREMENT_UNITS = [
  { value: 'g', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'l', label: 'Liters (l)' },
  { value: 'count', label: 'Count/Pieces' },
];

const OWNER_EMAIL = 'subavignesh33@gmail.com';

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [isSeller, setIsSeller] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [packingTypes, setPackingTypes] = useState<{ id: string; name: string }[]>([]);
  const [requestedProducts, setRequestedProducts] = useState<RequestedProduct[]>([]);
  const [customers, setCustomers] = useState<{ user_id: string; full_name: string | null; phone: string | null; address: string | null; created_at: string; email?: string; is_blocked?: boolean; loyalty_enabled?: boolean }[]>([]);
  const [customerRoles, setCustomerRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const billRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [userLoyaltyMap, setUserLoyaltyMap] = useState<Record<string, number>>({});
  const [loyaltyClaims, setLoyaltyClaims] = useState<any[]>([]);
  const [loyaltyMinAmount, setLoyaltyMinAmount] = useState(200);
  const [loyaltyMinAmountInput, setLoyaltyMinAmountInput] = useState('200');

  // Per-seller loyalty settings (seller_id -> settings)
  interface LoyaltySetting {
    seller_id: string;
    enabled: boolean;
    stamps_required: number;
    reward_amount: number;
    min_order_value: number;
  }
  const [loyaltySettingsMap, setLoyaltySettingsMap] = useState<Record<string, LoyaltySetting>>({});
  const [sellerLoyaltyForm, setSellerLoyaltyForm] = useState<LoyaltySetting>({
    seller_id: '',
    enabled: true,
    stamps_required: 10,
    reward_amount: 50,
    min_order_value: 0,
  });
  const [savingLoyaltySettings, setSavingLoyaltySettings] = useState(false);
  const [adminOrdersSellerTab, setAdminOrdersSellerTab] = useState<string>('all');

  // Product form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('g');
  const [packingType, setPackingType] = useState('pouch');
  const [isOnSale, setIsOnSale] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [isLimitedSale, setIsLimitedSale] = useState(false);
  const [saleEndTime, setSaleEndTime] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([
    { quantity: 50, price: 50, wholesalePrice: 0, isDefault: true, stockQuantity: 100 },
  ]);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Per-product delivery & wholesale tiers
  const [deliveryCharge, setDeliveryCharge] = useState('0');
  const [freeDeliveryQuantity, setFreeDeliveryQuantity] = useState('0');
  const [wholesaleTiers, setWholesaleTiers] = useState<{ minQuantity: number; price: number }[]>([]);
  const [unlimitedStock, setUnlimitedStock] = useState(false);

  // New category/packing type form
  const [newCategory, setNewCategory] = useState('');
  const [newPackingType, setNewPackingType] = useState('');

  useEffect(() => {
    const checkSellerRole = async () => {
      if (user) {
        const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'seller' as any });
        setIsSeller(data === true);
      }
    };
    checkSellerRole();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate('/login');
        return;
      }
      if (!isAdmin && !isSeller) {
        toast({
          title: "Access Denied",
          description: "You don't have seller permissions.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      fetchData();
    }
  }, [user, authLoading, isAdmin, adminLoading, isSeller, navigate]);

  const fetchData = async () => {
    await Promise.all([
      fetchOrders(),
      fetchProducts(),
      fetchCategories(),
      fetchPackingTypes(),
      fetchRequestedProducts(),
      fetchCustomers(),
      fetchLoyaltyClaims(),
      fetchLoyaltyMinAmount(),
      fetchLoyaltySettings(),
    ]);
    setLoading(false);
  };

  const fetchLoyaltySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('seller_loyalty_settings' as any)
        .select('*');
      if (!error && data) {
        const map: Record<string, LoyaltySetting> = {};
        (data as any[]).forEach((s) => { map[s.seller_id] = s as LoyaltySetting; });
        setLoyaltySettingsMap(map);
      }
    } catch (err) {
      console.error('Error fetching loyalty settings:', err);
    }
  };

  // Seed local form when user / settings load
  useEffect(() => {
    if (!user) return;
    const existing = loyaltySettingsMap[user.id];
    setSellerLoyaltyForm({
      seller_id: user.id,
      enabled: existing?.enabled ?? true,
      stamps_required: existing?.stamps_required ?? 10,
      reward_amount: existing?.reward_amount ?? 50,
      min_order_value: existing?.min_order_value ?? 0,
    });
  }, [user, loyaltySettingsMap]);

  const handleSaveSellerLoyaltySettings = async () => {
    if (!user) return;
    const f = sellerLoyaltyForm;
    if (!Number.isInteger(f.stamps_required) || f.stamps_required < 1 || f.stamps_required > 50) {
      toast({ title: 'Stamps required must be 1–50', variant: 'destructive' });
      return;
    }
    if (f.reward_amount < 0 || f.min_order_value < 0) {
      toast({ title: 'Amounts cannot be negative', variant: 'destructive' });
      return;
    }
    setSavingLoyaltySettings(true);
    const { error } = await supabase
      .from('seller_loyalty_settings' as any)
      .upsert({
        seller_id: user.id,
        enabled: f.enabled,
        stamps_required: f.stamps_required,
        reward_amount: f.reward_amount,
        min_order_value: f.min_order_value,
      } as any, { onConflict: 'seller_id' });
    setSavingLoyaltySettings(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    setLoyaltySettingsMap((prev) => ({ ...prev, [user.id]: { ...f } }));
    toast({ title: '✅ Loyalty settings saved' });
  };

  const fetchLoyaltyClaims = async () => {
    try {
      const { data, error } = await supabase
        .from('loyalty_claims')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setLoyaltyClaims(data);
    } catch (err) {
      console.error('Error fetching loyalty claims:', err);
    }
  };

  const fetchLoyaltyMinAmount = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'loyalty_min_amount')
        .single();
      if (data) {
        setLoyaltyMinAmount(Number(data.value));
        setLoyaltyMinAmountInput(data.value);
      }
    } catch (err) {
      console.error('Error fetching loyalty min amount:', err);
    }
  };

  const handleSaveLoyaltyMinAmount = async () => {
    const val = Number(loyaltyMinAmountInput);
    if (isNaN(val) || val < 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }
    await supabase
      .from('app_settings')
      .update({ value: String(val) } as any)
      .eq('key', 'loyalty_min_amount');
    setLoyaltyMinAmount(val);
    toast({ title: '✅ Minimum amount updated', description: `Loyalty stamps now require ₹${val}+ orders` });
  };

  const handleDeleteLoyaltyClaim = async (claimId: string) => {
    const { error } = await supabase.from('loyalty_claims').delete().eq('id', claimId);
    if (!error) {
      setLoyaltyClaims(prev => prev.filter(c => c.id !== claimId));
      toast({ title: 'Claim deleted' });
    } else {
      toast({ title: 'Error deleting claim', variant: 'destructive' });
    }
  };

  const handleResetCustomerPoints = async (customerPhone: string, customerUserId?: string) => {
    // To reset points, we insert a "redeemed" claim that accounts for remaining stamps
    // This effectively zeros out their progress
    const customerStamps: Record<string, { name: string; userId: string; stamps: number }> = {};
    const redeemedPerUser: Record<string, number> = {};
    loyaltyClaims.filter(c => c.is_redeemed).forEach(c => {
      redeemedPerUser[c.customer_phone] = (redeemedPerUser[c.customer_phone] || 0) + 1;
    });
    orders.forEach(order => {
      if ((order as any).loyalty_coupon_code) return;
      if (order.total < loyaltyMinAmount) return;
      const key = order.customer_phone;
      if (!customerStamps[key]) {
        customerStamps[key] = { name: order.customer_name, userId: order.user_id, stamps: 0 };
      }
      customerStamps[key].stamps += 1;
    });
    Object.keys(customerStamps).forEach(key => {
      const redeemed = redeemedPerUser[key] || 0;
      customerStamps[key].stamps = Math.max(0, customerStamps[key].stamps - (redeemed * 10));
    });

    const cust = customerStamps[customerPhone];
    if (!cust || cust.stamps <= 0) return;

    // Insert fake redeemed claims to zero out stamps
    const cyclesNeeded = Math.ceil(cust.stamps / 10);
    for (let i = 0; i < cyclesNeeded; i++) {
      await supabase.from('loyalty_claims').insert({
        user_id: cust.userId,
        customer_name: cust.name,
        customer_phone: customerPhone,
        coupon_code: `RESET-${Date.now()}-${i}`,
        stamps_completed: 10,
        is_redeemed: true,
      } as any);
    }
    await fetchLoyaltyClaims();
    toast({ title: '🔄 Points reset', description: `${cust.name}'s loyalty points have been cleared` });
  };

  const handleManualLoyaltyAdjust = async (customerPhone: string, customerName: string, customerUserId: string, increment: boolean) => {
    if (increment) {
      // Add a fake qualifying order equivalent by inserting a redeemed=false claim placeholder
      // Actually, we add a "manual stamp" via a special order-like mechanism
      // Simplest: insert a manual loyalty_claims entry with stamps_completed=1, is_redeemed=true to track
      // Better approach: we'll use a special coupon code prefix "MANUAL-ADD"
      await supabase.from('loyalty_claims').insert({
        user_id: customerUserId,
        customer_name: customerName,
        customer_phone: customerPhone,
        coupon_code: `MANUAL-ADD-${Date.now()}`,
        stamps_completed: -1, // negative means manual add
        is_redeemed: true,
      } as any);
      toast({ title: '➕ Point added', description: `Added 1 loyalty point for ${customerName}` });
    } else {
      // Remove a point by adding a manual subtract
      await supabase.from('loyalty_claims').insert({
        user_id: customerUserId,
        customer_name: customerName,
        customer_phone: customerPhone,
        coupon_code: `MANUAL-SUB-${Date.now()}`,
        stamps_completed: -2, // -2 means manual subtract
        is_redeemed: true,
      } as any);
      toast({ title: '➖ Point removed', description: `Removed 1 loyalty point for ${customerName}` });
    }
    await fetchLoyaltyClaims();
  };

  const isOwner = user?.email === OWNER_EMAIL;

  const fetchRequestedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('requested_products')
        .select(`
          *,
          product:products(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequestedProducts(data || []);
    } catch (error) {
      console.error('Error fetching requested products:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, address, created_at, loyalty_enabled, is_blocked, theme')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setCustomers(data as any);
      }
      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rolesData) {
        const roleMap: Record<string, string> = {};
        rolesData.forEach((r: any) => { roleMap[r.user_id] = r.role; });
        setCustomerRoles(roleMap);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsedOrders = (data || []).map(order => ({
        ...order,
        items: order.items as unknown as OrderItem[],
        order_status: order.order_status || 'pending'
      }));

      setOrders(parsedOrders);

      // Compute loyalty stamps per user (only orders with total >= 200)
      const loyaltyMap: Record<string, number> = {};
      (data || []).forEach(order => {
        if (order.total >= loyaltyMinAmount) {
          loyaltyMap[order.user_id] = (loyaltyMap[order.user_id] || 0) + 1;
        }
      });
      setUserLoyaltyMap(loyaltyMap);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false });
      
      // Sellers (non-admin) only see their own products
      if (!isAdmin && isSeller && user) {
        query = query.eq('seller_id', user.id);
      }

      const { data: productsData, error: productsError } = await query;

      if (productsError) throw productsError;

      const productsWithDetails: ProductWithDetails[] = await Promise.all(
        (productsData || []).map(async (product) => {
          const [variantsRes, imagesRes] = await Promise.all([
            supabase.from('product_variants').select('*').eq('product_id', product.id),
            supabase.from('product_images').select('*').eq('product_id', product.id).order('display_order'),
          ]);

          return {
            ...product,
            variants: variantsRes.data || [],
            images: imagesRes.data || [],
          };
        })
      );

      setProducts(productsWithDetails);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPackingTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('packing_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setPackingTypes(data || []);
    } catch (error) {
      console.error('Error fetching packing types:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // If delivered, also update payment_status to 'paid' for COD orders
      const order = orders.find(o => o.id === orderId);
      const updates: { order_status: string; payment_status?: string } = { order_status: newStatus };
      
      if (newStatus === 'delivered' && order?.payment_method === 'cod') {
        updates.payment_status = 'paid';
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, order_status: newStatus, ...(updates.payment_status && { payment_status: updates.payment_status }) } 
          : order
      ));

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}${updates.payment_status ? ' (Payment marked as paid)' : ''}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, payment_status: newStatus } : order
      ));

      toast({
        title: "Payment Status Updated",
        description: `Payment marked as ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const deleteRequestedProduct = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('requested_products')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setRequestedProducts(prev => prev.filter(r => r.id !== requestId));
      toast({ title: "Request Deleted" });
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to delete request",
        variant: "destructive"
      });
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.filter(order => order.id !== orderId));

      toast({
        title: "Order Deleted",
        description: "Order has been removed from the system",
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive"
      });
    }
  };

  const shareOrderBill = async (order: Order) => {
    const billElement = billRefs.current[order.id];
    if (billElement) {
      try {
        const canvas = await html2canvas(billElement, {
          backgroundColor: '#ffffff',
          scale: 2,
        });
        
        const billNo = order.order_number || getOrderIdForDisplay(order.id);
        
        // Convert canvas to blob for image sharing
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });
        const file = new File([blob], `PUTHIYAM_Bill_${billNo}.png`, { type: 'image/png' });

        // Try Web Share API for image-only sharing
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `PUTHIYAM Bill - ${billNo}`,
          });
        } else {
          // Fallback: download the image
          const link = document.createElement('a');
          link.download = `PUTHIYAM_Bill_${billNo}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          toast({ title: "Bill Downloaded", description: "Share the downloaded bill image on WhatsApp manually." });
        }

        toast({ title: "Bill Generated", description: "Bill image ready for sharing" });
      } catch (error) {
        console.error('Error generating bill:', error);
        toast({ title: "Error", description: "Failed to generate bill image", variant: "destructive" });
      }
    }
  };

  const toggleProductStock = async (productId: string, isInStock: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_in_stock: isInStock })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_in_stock: isInStock } : p
      ));

      toast({
        title: isInStock ? "Product In Stock" : "Product Out of Stock",
        description: `Product stock status updated`,
      });
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  const toggleProductSale = async (productId: string, isOnSale: boolean) => {
    try {
      const updates: any = { is_on_sale: isOnSale };
      if (!isOnSale) {
        updates.sale_end_time = null;
      }
      
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_on_sale: isOnSale, ...(isOnSale ? {} : { sale_end_time: null }) } : p
      ));

      toast({
        title: isOnSale ? "Sale Enabled" : "Sale Disabled",
      });
    } catch (error) {
      console.error('Error updating sale status:', error);
    }
  };

  const updateProductDiscount = async (productId: string, discount: number, type: 'amount' | 'percentage') => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ discount_amount: discount, discount_type: type })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, discount_amount: discount, discount_type: type } : p
      ));

      toast({ title: "Discount Updated" });
    } catch (error) {
      console.error('Error updating discount:', error);
    }
  };

  const updateProductSaleEndTime = async (productId: string, endTime: string | null) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ sale_end_time: endTime })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, sale_end_time: endTime } : p
      ));

      toast({ title: endTime ? "Sale Timer Set" : "Sale Timer Removed" });
    } catch (error) {
      console.error('Error updating sale end time:', error);
    }
  };


  const deletePackingType = async (packingTypeId: string) => {
    try {
      const { error } = await supabase
        .from('packing_types')
        .delete()
        .eq('id', packingTypeId);

      if (error) throw error;

      setPackingTypes(prev => prev.filter(p => p.id !== packingTypeId));
      toast({ title: "Packing Type Deleted" });
    } catch (error) {
      console.error('Error deleting packing type:', error);
      toast({
        title: "Error",
        description: "Failed to delete packing type",
        variant: "destructive"
      });
    }
  };

  const deleteExistingImage = async (imageId: string, imageUrl: string, productId: string) => {
    try {
      const path = imageUrl.split('/product-images/')[1];
      if (path) {
        await supabase.storage.from('product-images').remove([path]);
      }
      const { error } = await supabase.from('product_images').delete().eq('id', imageId);
      if (error) throw error;

      if (editingProduct) {
        setEditingProduct({
          ...editingProduct,
          images: editingProduct.images.filter(img => img.id !== imageId),
        });
      }
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, images: p.images.filter(img => img.id !== imageId) } : p
      ));
      toast({ title: "Image Deleted" });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({ title: "Error", description: "Failed to delete image", variant: "destructive" });
    }
  };

  const addImageToExistingProduct = async (files: FileList, productId: string) => {
    try {
      setUploading(true);
      const currentImages = editingProduct?.images || [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}/${Date.now()}-${i}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
        const { data: imgData, error: imgError } = await supabase.from('product_images').insert({
          product_id: productId,
          image_url: urlData.publicUrl,
          is_primary: currentImages.length === 0 && i === 0,
          display_order: currentImages.length + i,
        }).select().single();
        if (imgError) throw imgError;
        if (editingProduct && imgData) {
          setEditingProduct(prev => prev ? { ...prev, images: [...prev.images, imgData] } : prev);
        }
      }
      toast({ title: "Images Added" });
      fetchProducts();
    } catch (error) {
      console.error('Error adding images:', error);
      toast({ title: "Error", description: "Failed to add images", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      // Delete images from storage first
      const product = products.find(p => p.id === productId);
      if (product) {
        for (const image of product.images) {
          const path = image.image_url.split('/product-images/')[1];
          if (path) {
            await supabase.storage.from('product-images').remove([path]);
          }
        }
      }

      // Delete from database (cascades to variants and images)
      const { error: variantsError } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productId);

      const { error: imagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));

      toast({
        title: "Product Deleted",
        description: "Product has been removed from the store",
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: newCategory.trim() })
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => [...prev, data]);
      setNewCategory('');
      toast({ title: "Category Added" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message?.includes('duplicate') ? "Category already exists" : "Failed to add category",
        variant: "destructive"
      });
    }
  };

  const addPackingType = async () => {
    if (!newPackingType.trim()) return;

    try {
      const { data, error } = await supabase
        .from('packing_types')
        .insert({ name: newPackingType.trim().toLowerCase() })
        .select()
        .single();

      if (error) throw error;

      setPackingTypes(prev => [...prev, data]);
      setNewPackingType('');
      toast({ title: "Packing Type Added" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message?.includes('duplicate') ? "Packing type already exists" : "Failed to add packing type",
        variant: "destructive"
      });
    }
  };

  const addVariant = () => {
    setVariants([...variants, { quantity: 100, price: 100, wholesalePrice: 0, isDefault: false, stockQuantity: 100 }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: number | boolean) => {
    setVariants(variants.map((v, i) => {
      if (i === index) {
        if (field === 'isDefault' && value === true) {
          return { ...v, isDefault: true };
        }
        return { ...v, [field]: value };
      }
      if (field === 'isDefault' && value === true) {
        return { ...v, isDefault: false };
      }
      return v;
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setProductImages([...productImages, ...Array.from(e.target.files)]);
    }
  };

  const removeImage = (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  const handleAddProduct = async () => {
    const computedBasePrice = variants.length > 0
      ? Math.min(...variants.map(v => Number(v.price) || 0).filter(p => p > 0))
      : 0;
    if (!productName || !productCategory || !computedBasePrice || !isFinite(computedBasePrice)) {
      toast({
        title: "Missing Fields",
        description: "Please fill in name, category and at least one variant with a price",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          seller_id: user!.id,
          name: productName,
          description: productDescription,
          category: productCategory,
          base_price: computedBasePrice,
          measurement_unit: measurementUnit,
          packing_type: packingType,
          is_on_sale: isOnSale,
          discount_amount: parseFloat(discountAmount) || 0,
          discount_type: discountType,
          sale_end_time: isLimitedSale && saleEndTime ? new Date(saleEndTime).toISOString() : null,
          delivery_charge: parseFloat(deliveryCharge) || 0,
          free_delivery_quantity: parseInt(freeDeliveryQuantity) || 0,
          unlimited_stock: unlimitedStock,
        } as any)
        .select()
        .single();

      if (productError) throw productError;

      // Add variants
      const variantInserts = variants.map(v => ({
        product_id: product.id,
        quantity: v.quantity,
        price: v.price,
        is_default: v.isDefault,
        stock_quantity: unlimitedStock ? 999999 : v.stockQuantity,
        wholesale_price: null,
      }));

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantInserts);

      if (variantError) throw variantError;

      // Insert wholesale tiers
      const tierInserts = wholesaleTiers
        .filter(t => t.minQuantity > 0 && t.price >= 0)
        .map(t => ({ product_id: product.id, min_quantity: t.minQuantity, price: t.price }));
      if (tierInserts.length > 0) {
        await supabase.from('product_wholesale_tiers').insert(tierInserts);
      }

      // Upload images
      for (let i = 0; i < productImages.length; i++) {
        const file = productImages[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${product.id}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        await supabase.from('product_images').insert({
          product_id: product.id,
          image_url: urlData.publicUrl,
          is_primary: i === 0,
          display_order: i,
        });
      }

      toast({
        title: "Product Added!",
        description: "Your product has been added successfully and is now visible to buyers",
      });

      // Reset form
      resetForm();

      // Refresh products list
      fetchProducts();

    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setProductName('');
    setProductDescription('');
    setProductCategory('');
    setMeasurementUnit('g');
    setPackingType('pouch');
    setIsOnSale(false);
    setDiscountAmount('');
    setDiscountType('amount');
    setIsLimitedSale(false);
    setSaleEndTime('');
    setVariants([{ quantity: 50, price: 50, wholesalePrice: 0, isDefault: true, stockQuantity: 100 }]);
    setProductImages([]);
    setEditingProduct(null);
    setDeliveryCharge('0');
    setFreeDeliveryQuantity('0');
    setWholesaleTiers([]);
    setUnlimitedStock(false);
  };

  const handleUpdateProduct = async () => {
    const computedBasePrice = variants.length > 0
      ? Math.min(...variants.map(v => Number(v.price) || 0).filter(p => p > 0))
      : 0;
    if (!editingProduct || !productName || !productCategory || !computedBasePrice || !isFinite(computedBasePrice)) {
      toast({
        title: "Missing Fields",
        description: "Please fill in name, category and at least one variant with a price",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Update product
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: productName,
          description: productDescription,
          category: productCategory,
          base_price: computedBasePrice,
          measurement_unit: measurementUnit,
          packing_type: packingType,
          is_on_sale: isOnSale,
          discount_amount: parseFloat(discountAmount) || 0,
          discount_type: discountType,
          sale_end_time: isLimitedSale && saleEndTime ? new Date(saleEndTime).toISOString() : null,
          delivery_charge: parseFloat(deliveryCharge) || 0,
          free_delivery_quantity: parseInt(freeDeliveryQuantity) || 0,
          unlimited_stock: unlimitedStock,
        } as any)
        .eq('id', editingProduct.id);

      if (productError) throw productError;

      // Update variants - delete old ones and insert new ones
      await supabase.from('product_variants').delete().eq('product_id', editingProduct.id);
      
      const variantInserts = variants.map(v => ({
        product_id: editingProduct.id,
        quantity: v.quantity,
        price: v.price,
        is_default: v.isDefault,
        stock_quantity: unlimitedStock ? 999999 : v.stockQuantity,
        wholesale_price: null,
      }));

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantInserts);

      if (variantError) throw variantError;

      // Replace wholesale tiers
      await supabase.from('product_wholesale_tiers').delete().eq('product_id', editingProduct.id);
      const tierInserts = wholesaleTiers
        .filter(t => t.minQuantity > 0 && t.price >= 0)
        .map(t => ({ product_id: editingProduct.id, min_quantity: t.minQuantity, price: t.price }));
      if (tierInserts.length > 0) {
        await supabase.from('product_wholesale_tiers').insert(tierInserts);
      }

      // Upload new images if any
      for (let i = 0; i < productImages.length; i++) {
        const file = productImages[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${editingProduct.id}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        await supabase.from('product_images').insert({
          product_id: editingProduct.id,
          image_url: urlData.publicUrl,
          is_primary: editingProduct.images.length === 0 && i === 0,
          display_order: editingProduct.images.length + i,
        });
      }

      toast({
        title: "Product Updated!",
        description: "Your product has been updated successfully",
      });

      // Reset form
      resetForm();

      // Refresh products list
      fetchProducts();

    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const statusObj = ORDER_STATUSES.find(s => s.value === status);
    return statusObj?.color || 'bg-gray-500';
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-pulse text-muted-foreground">Loading seller dashboard...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ---- Orders rendering helpers ----
  const renderOrdersTable = (list: Order[], emptyText = 'No orders yet') => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Orders ({list.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{emptyText}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono font-bold text-primary">
                      {order.order_number || getOrderIdForDisplay(order.id)}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(order.created_at)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                        {order.customer_address && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{order.customer_address}</p>
                        )}
                        {(order as any).loyalty_coupon_code && (
                          <Badge variant="outline" className="mt-1 text-[10px] border-accent text-accent font-bold">🎁 Offer Claimed</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.items.map((item, i) => (
                          <div key={i}>
                            {item.name}
                            {item.selectedVariant && ` (${item.selectedVariant.weight})`}
                            {' × '}{item.quantity}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">₹{order.total}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Select value={order.payment_status} onValueChange={(value) => updatePaymentStatus(order.id, value)}>
                          <SelectTrigger className="w-24 h-7"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">{order.payment_method}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(order.order_status)} text-white`}>{order.order_status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select value={order.order_status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ORDER_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => shareOrderBill(order)} title="Share Bill">
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete this order. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteOrder(order.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                        <OrderBillImage
                          ref={(el) => { billRefs.current[order.id] = el; }}
                          orderId={order.order_number || order.id}
                          customerName={order.customer_name}
                          customerPhone={order.customer_phone}
                          customerAddress={order.customer_address}
                          deliveryType={order.delivery_type}
                          paymentMethod={order.payment_method}
                          paymentStatus={order.payment_status}
                          orderStatus={order.order_status}
                          items={order.items}
                          subtotal={order.subtotal}
                          shippingCost={order.shipping_cost}
                          total={order.total}
                          createdAt={order.created_at}
                          loyaltyInfo={userLoyaltyMap[order.user_id] ? { stamps: userLoyaltyMap[order.user_id] % 11 } : null}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Build seller list (used by admin cross-seller view, and to scope each seller's own orders)
  const adminSellerGroups: Array<{ id: string; name: string; productIds: Set<string>; orders: Order[] }> = (() => {
    const groups: Record<string, { id: string; name: string; productIds: Set<string> }> = {};
    products.forEach((p) => {
      if (!groups[p.seller_id]) {
        const profile = customers.find((c) => c.user_id === p.seller_id);
        groups[p.seller_id] = {
          id: p.seller_id,
          name: profile?.full_name || (p.seller_id === user?.id ? 'You (Owner)' : 'Unknown Seller'),
          productIds: new Set<string>(),
        };
      }
      groups[p.seller_id].productIds.add(p.id);
    });
    return Object.values(groups).map((g) => {
      const sellerOrders: Order[] = [];
      orders.forEach((o) => {
        const items = (o.items || []).filter((it: any) => g.productIds.has(it.id));
        if (items.length === 0) return;
        const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
        sellerOrders.push({ ...o, items, subtotal, shipping_cost: 0, total: subtotal });
      });
      return { ...g, orders: sellerOrders };
    }).sort((a, b) => b.orders.length - a.orders.length);
  })();

  // Orders that belong to the currently-signed-in seller (their own products only)
  const myOrders: Order[] = (() => {
    if (isAdmin) return orders; // admins see everything in their own seller view; their cross-seller view is separate
    const mine = adminSellerGroups.find((g) => g.id === user?.id);
    return mine ? mine.orders : [];
  })();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <div className="gradient-hero rounded-2xl p-8 text-primary-foreground text-center">
            <h1 className="font-serif text-3xl font-bold mb-2 animate-fade-in">
              Seller Dashboard
            </h1>
            <p className="opacity-90">Manage your products and orders</p>
          </div>
        </section>

        {/* Admin cross-seller dashboard moved to /admin route */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab buttons arranged on two rows */}
          <TabsList className="h-auto w-full grid grid-cols-3 sm:grid-cols-5 gap-1 p-1">
            <TabsTrigger value="orders" className="flex items-center gap-1 text-xs">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="pos" className="flex items-center gap-1 text-xs">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">POS</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="requests" className="flex items-center gap-1 text-xs">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Requests</span>
                {requestedProducts.length > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {requestedProducts.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="loyalty" className="flex items-center gap-1 text-xs">
              <Gift className="w-4 h-4" />
              <span className="hidden sm:inline">Loyalty</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="customers" className="flex items-center gap-1 text-xs">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Customers</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="products" className="flex items-center gap-1 text-xs">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="barcodes" className="flex items-center gap-1 text-xs">
              <Barcode className="w-4 h-4" />
              <span className="hidden sm:inline">Barcodes</span>
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-1 text-xs">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add New</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1 text-xs">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 text-xs">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab — only this seller's own orders */}
          <TabsContent value="orders" className="space-y-4">
            {renderOrdersTable(myOrders)}
          </TabsContent>

          <TabsContent value="pos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" /> POS / Cash Sale
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                <p className="text-sm text-muted-foreground">
                  Full-screen billing page: product search & scanning, wholesale pricing, courier details,
                  UPI QR, invoice preview and automatic WhatsApp bill delivery.
                </p>
                <Button size="lg" className="gradient-hero text-primary-foreground" onClick={() => navigate('/pos')}>
                  <Maximize2 className="w-4 h-4 mr-2" /> Open POS
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Barcode Management */}
          <TabsContent value="barcodes" className="space-y-4">
            {user && <BarcodeTab sellerId={user.id} />}
          </TabsContent>

          {/* Requested Products Tab */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Pre-Booked Products ({requestedProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requestedProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pre-booking requests yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Variant</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requestedProducts.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell className="text-sm">
                              {formatDate(request.created_at)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {request.product?.name || 'Unknown Product'}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{request.customer_name}</p>
                                <p className="text-xs text-muted-foreground">{request.customer_phone}</p>
                                {request.customer_address && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {request.customer_address}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {request.variant_quantity && request.variant_price ? (
                                <span>{request.variant_quantity}g - ₹{request.variant_price}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    // Navigate to product to restock
                                    const product = products.find(p => p.id === request.product_id);
                                    if (product) {
                                      setEditingProduct(product);
                                      setActiveTab('add');
                                    }
                                  }}
                                >
                                  Restock
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Request?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove this pre-booking request.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteRequestedProduct(request.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loyalty Claims Tab */}
          <TabsContent value="loyalty" className="space-y-6">
            {!isAdmin && isSeller && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    My Loyalty Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Loyalty Program Enabled</Label>
                      <p className="text-xs text-muted-foreground">Turn loyalty stamps on or off for your customers.</p>
                    </div>
                    <Switch
                      checked={sellerLoyaltyForm.enabled}
                      onCheckedChange={(checked) => setSellerLoyaltyForm((f) => ({ ...f, enabled: checked }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm">Stamps Required</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={sellerLoyaltyForm.stamps_required}
                        onChange={(e) => setSellerLoyaltyForm((f) => ({ ...f, stamps_required: parseInt(e.target.value || '0', 10) }))}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">Stamps to earn one reward.</p>
                    </div>
                    <div>
                      <Label className="text-sm">Reward Amount (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={sellerLoyaltyForm.reward_amount}
                        onChange={(e) => setSellerLoyaltyForm((f) => ({ ...f, reward_amount: parseFloat(e.target.value || '0') }))}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">Discount given when card is full.</p>
                    </div>
                    <div>
                      <Label className="text-sm">Min Order Value (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={sellerLoyaltyForm.min_order_value}
                        onChange={(e) => setSellerLoyaltyForm((f) => ({ ...f, min_order_value: parseFloat(e.target.value || '0') }))}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">Minimum order to earn one stamp.</p>
                    </div>
                  </div>
                  <Button onClick={handleSaveSellerLoyaltySettings} disabled={savingLoyaltySettings} size="sm">
                    {savingLoyaltySettings ? 'Saving…' : 'Save Loyalty Settings'}
                  </Button>
                </CardContent>
              </Card>
            )}
            {!isAdmin && isSeller && (() => {
              const sellerProductIds = new Set(products.map(p => p.id));
              const sellerOrders = orders.filter(o => (o.items || []).some((it: any) => sellerProductIds.has(it.id)));
              const phones = new Set(sellerOrders.map(o => o.customer_phone));
              const scopedClaims = loyaltyClaims.filter(c => phones.has(c.customer_phone));
              const redeemedPerUser: Record<string, number> = {};
              scopedClaims.filter(c => c.is_redeemed).forEach(c => {
                redeemedPerUser[c.customer_phone] = (redeemedPerUser[c.customer_phone] || 0) + 1;
              });
              const customerStamps: Record<string, { name: string; phone: string; stamps: number }> = {};
              sellerOrders.forEach(o => {
                if ((o as any).loyalty_coupon_code) return;
                if (o.total < loyaltyMinAmount) return;
                const key = o.customer_phone;
                if (!customerStamps[key]) customerStamps[key] = { name: o.customer_name, phone: o.customer_phone, stamps: 0 };
                customerStamps[key].stamps += 1;
              });
              Object.keys(customerStamps).forEach(key => {
                const r = redeemedPerUser[key] || 0;
                customerStamps[key].stamps = Math.max(0, customerStamps[key].stamps - r * 10) % 10;
              });
              const list = Object.values(customerStamps).sort((a, b) => b.stamps - a.stamps);
              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="p-3 text-center"><p className="text-2xl font-bold text-primary">{scopedClaims.length}</p><p className="text-xs text-muted-foreground">Total Claims</p></Card>
                    <Card className="p-3 text-center"><p className="text-2xl font-bold text-primary">{scopedClaims.filter(c => c.is_redeemed).length}</p><p className="text-xs text-muted-foreground">Redeemed</p></Card>
                    <Card className="p-3 text-center"><p className="text-2xl font-bold text-primary">{scopedClaims.filter(c => !c.is_redeemed).length}</p><p className="text-xs text-muted-foreground">Pending</p></Card>
                    <Card className="p-3 text-center"><p className="text-2xl font-bold text-primary">{list.filter(c => c.stamps > 0).length}</p><p className="text-xs text-muted-foreground">In Progress</p></Card>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-primary" />
                        Customer Loyalty Progress (Your Products)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {list.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">No loyalty activity for your products yet</p>
                      ) : (
                        <div className="grid gap-3">
                          {list.map(cust => (
                            <div key={cust.phone} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{cust.name}</p>
                                <p className="text-xs text-muted-foreground">{cust.phone}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] ${i < cust.stamps ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-muted-foreground/30'}`}>{i < cust.stamps ? '✓' : ''}</div>
                                  ))}
                                </div>
                                <Badge variant="secondary" className="font-mono text-xs">{cust.stamps}/10</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              );
            })()}
            {isAdmin && (<>
            {/* Loyalty Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Loyalty Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Minimum Order Amount for Loyalty Stamp (₹)</Label>
                    <Input
                      type="number"
                      value={loyaltyMinAmountInput}
                      onChange={(e) => setLoyaltyMinAmountInput(e.target.value)}
                      className="mt-1"
                      placeholder="e.g. 200"
                    />
                  </div>
                  <Button onClick={handleSaveLoyaltyMinAmount} size="sm">
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Orders must be ₹{loyaltyMinAmount} or more to earn a loyalty stamp.
                </p>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{loyaltyClaims.length}</p>
                <p className="text-xs text-muted-foreground">Total Claims</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{loyaltyClaims.filter(c => c.is_redeemed).length}</p>
                <p className="text-xs text-muted-foreground">Redeemed</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{loyaltyClaims.filter(c => !c.is_redeemed).length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{(() => {
                  const customerStamps: Record<string, number> = {};
                  orders.forEach(o => { if (o.total >= loyaltyMinAmount && !(o as any).loyalty_coupon_code) customerStamps[o.customer_phone] = (customerStamps[o.customer_phone] || 0) + 1; });
                  return Object.values(customerStamps).filter(s => s % 10 > 0).length;
                })()}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </Card>
            </div>

            {/* All Claims from DB */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  All Loyalty Claims ({loyaltyClaims.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loyaltyClaims.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No loyalty claims yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Coupon Code</TableHead>
                          <TableHead>Stamps</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Bill</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loyaltyClaims.map((claim, idx) => {
                          const linkedOrder = claim.order_id ? orders.find(o => o.id === claim.order_id) : null;
                          return (
                            <TableRow key={claim.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell className="font-medium">{idx + 1}</TableCell>
                              <TableCell className="text-sm">{new Date(claim.claimed_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{claim.customer_name}</p>
                                  <p className="text-xs text-muted-foreground">{claim.customer_phone}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-accent/20 text-accent-foreground font-mono">
                                  🎁 {claim.coupon_code}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className="w-3 h-3 rounded-full bg-primary" />
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                              <Badge variant={claim.is_redeemed ? 'default' : 'secondary'}>
                                  {claim.is_redeemed ? '✅ Used' : '⏳ Pending'}
                                </Badge>
                                {!claim.is_redeemed && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-1 text-xs"
                                    onClick={async () => {
                                      await supabase.from('loyalty_claims').update({ is_redeemed: true }).eq('id', claim.id);
                                      setLoyaltyClaims(prev => prev.map(c => c.id === claim.id ? { ...c, is_redeemed: true } : c));
                                      toast({ title: '✅ Marked as used', description: `Coupon ${claim.coupon_code} marked as redeemed` });
                                    }}
                                  >
                                    Mark Used
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>
                                {linkedOrder && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => shareOrderBill(linkedOrder)}
                                    title="Share Bill"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete this claim?</AlertDialogTitle>
                                      <AlertDialogDescription>This will permanently remove this loyalty claim record.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteLoyaltyClaim(claim.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Loyalty Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  Pending Loyalty Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const redeemedPerUser: Record<string, number> = {};
                  loyaltyClaims.filter(c => c.is_redeemed).forEach(c => {
                    redeemedPerUser[c.customer_phone] = (redeemedPerUser[c.customer_phone] || 0) + 1;
                  });
                  const customerStamps: Record<string, { name: string; phone: string; userId: string; stamps: number }> = {};
                  orders.forEach(order => {
                    if ((order as any).loyalty_coupon_code) return;
                    if (order.total < loyaltyMinAmount) return;
                    const key = order.customer_phone;
                    if (!customerStamps[key]) {
                      customerStamps[key] = { name: order.customer_name, phone: order.customer_phone, userId: order.user_id, stamps: 0 };
                    }
                    customerStamps[key].stamps += 1;
                  });
                  // Account for manual adjustments
                  loyaltyClaims.forEach(c => {
                    if (c.stamps_completed === -1 && c.is_redeemed) {
                      // manual add
                      const key = c.customer_phone;
                      if (!customerStamps[key]) {
                        customerStamps[key] = { name: c.customer_name, phone: c.customer_phone, userId: c.user_id, stamps: 0 };
                      }
                      customerStamps[key].stamps += 1;
                    } else if (c.stamps_completed === -2 && c.is_redeemed) {
                      // manual subtract
                      const key = c.customer_phone;
                      if (customerStamps[key]) {
                        customerStamps[key].stamps = Math.max(0, customerStamps[key].stamps - 1);
                      }
                    }
                  });
                  // Subtract redeemed cycles
                  Object.keys(customerStamps).forEach(key => {
                    const redeemed = redeemedPerUser[key] || 0;
                    customerStamps[key].stamps = Math.max(0, customerStamps[key].stamps - (redeemed * 10)) % 10;
                  });
                  const pending = Object.values(customerStamps).filter(c => c.stamps > 0 || c.stamps === 0);
                  const allCustomers = Object.values(customerStamps);
                  if (allCustomers.length === 0) {
                    return <p className="text-center text-muted-foreground py-6">No customers with pending loyalty stamps</p>;
                  }
                  return (
                    <div className="grid gap-3">
                      {allCustomers.sort((a, b) => b.stamps - a.stamps).map((cust) => (
                        <div key={cust.phone} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{cust.name}</p>
                            <p className="text-xs text-muted-foreground">{cust.phone}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Manual +/- buttons */}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => handleManualLoyaltyAdjust(cust.phone, cust.name, cust.userId, false)}
                              title="Remove 1 point"
                              disabled={cust.stamps <= 0}
                            >
                              <MinusCircle className="w-3.5 h-3.5" />
                            </Button>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 10 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] ${
                                    i < cust.stamps
                                      ? 'bg-primary border-primary text-primary-foreground'
                                      : 'border-muted-foreground/30 text-muted-foreground/30'
                                  }`}
                                >
                                  {i < cust.stamps ? '✓' : ''}
                                </div>
                              ))}
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 text-primary hover:bg-primary/10"
                              onClick={() => handleManualLoyaltyAdjust(cust.phone, cust.name, cust.userId, true)}
                              title="Add 1 point"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                            </Button>
                            <Badge variant="secondary" className="font-mono text-xs">
                              {cust.stamps}/10
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reset {cust.name}'s points?</AlertDialogTitle>
                                  <AlertDialogDescription>This will clear all loyalty stamps for this customer. They will start from 0.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleResetCustomerPoints(cust.phone)}>Reset Points</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Orders with Loyalty Coupon */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-green-500" />
                  Orders with Loyalty Coupon ({orders.filter(o => (o as any).loyalty_coupon_code).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.filter(o => (o as any).loyalty_coupon_code).length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No orders with loyalty coupons</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bill No.</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Coupon</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Bill</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.filter(o => (o as any).loyalty_coupon_code).map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono font-bold text-primary">
                              {order.order_number || getOrderIdForDisplay(order.id)}
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(order.created_at)}</TableCell>
                            <TableCell>
                              <p className="font-medium">{order.customer_name}</p>
                              <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-accent/20 text-accent-foreground font-mono">
                                🎁 {(order as any).loyalty_coupon_code}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">₹{order.total}</TableCell>
                            <TableCell>
                              <Button variant="outline" size="icon" onClick={() => shareOrderBill(order)}>
                                <Share2 className="w-4 h-4" />
                              </Button>
                              <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                                <OrderBillImage
                                  ref={(el) => { billRefs.current[`loyalty-${order.id}`] = el; }}
                                  orderId={order.order_number || order.id}
                                  customerName={order.customer_name}
                                  customerPhone={order.customer_phone}
                                  customerAddress={order.customer_address}
                                  deliveryType={order.delivery_type}
                                  paymentMethod={order.payment_method}
                                  paymentStatus={order.payment_status}
                                  orderStatus={order.order_status}
                                  items={order.items}
                                  subtotal={order.subtotal}
                                  shippingCost={order.shipping_cost}
                                  total={order.total}
                                  createdAt={order.created_at}
                                  loyaltyInfo={{ stamps: 10, couponCode: (order as any).loyalty_coupon_code }}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            </>)}
          </TabsContent>

          {/* Manage Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Manage Products ({products.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No products yet</p>
                ) : (
                  <div className="grid gap-4">
                    {products.map((product) => (
                      <div key={product.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg">
                        <div className="w-24 h-24 flex-shrink-0">
                          {product.images[0] ? (
                            <img
                              src={product.images[0].image_url}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                              <Package className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">{product.category}</p>
                              <p className="text-sm">Base: ₹{product.base_price} / {product.measurement_unit}</p>
                            </div>
                            <div className="flex gap-2">
                              {product.is_on_sale && (
                                <Badge variant="destructive">
                                  <Percent className="w-3 h-3 mr-1" />
                                  ₹{product.discount_amount} OFF
                                </Badge>
                              )}
                              {!product.is_in_stock && (
                                <Badge variant="destructive">Out of Stock</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={product.is_in_stock}
                                onCheckedChange={(checked) => toggleProductStock(product.id, checked)}
                              />
                              <Label className="text-sm">In Stock</Label>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={product.is_on_sale}
                                onCheckedChange={(checked) => toggleProductSale(product.id, checked)}
                              />
                              <Label className="text-sm">On Sale</Label>
                            </div>

                            {product.is_on_sale && (
                              <div className="flex flex-wrap items-center gap-2">
                                <Select
                                  value={product.discount_type || 'amount'}
                                  onValueChange={(value: 'amount' | 'percentage') => updateProductDiscount(product.id, product.discount_amount, value)}
                                >
                                  <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="amount">₹</SelectItem>
                                    <SelectItem value="percentage">%</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  className="w-20 h-8"
                                  value={product.discount_amount}
                                  onChange={(e) => updateProductDiscount(product.id, parseFloat(e.target.value) || 0, (product.discount_type as 'amount' | 'percentage') || 'amount')}
                                  placeholder="Value"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {product.discount_type === 'percentage' ? '% off' : 'off'}
                                </span>
                              </div>
                            )}

                            {product.is_on_sale && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <Input
                                  type="datetime-local"
                                  className="w-auto h-8 text-xs"
                                  value={product.sale_end_time ? new Date(product.sale_end_time).toISOString().slice(0, 16) : ''}
                                  onChange={(e) => updateProductSaleEndTime(product.id, e.target.value ? new Date(e.target.value).toISOString() : null)}
                                />
                                {product.sale_end_time && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-6 h-6"
                                    onClick={() => updateProductSaleEndTime(product.id, null)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setEditingProduct(product);
                                setActiveTab('add');
                                // Pre-fill form with product data
                                setProductName(product.name);
                                setProductDescription(product.description || '');
                                setProductCategory(product.category);
                                setMeasurementUnit(product.measurement_unit);
                                setPackingType(product.packing_type || 'pouch');
                                setIsOnSale(product.is_on_sale);
                                setDiscountAmount(product.discount_amount.toString());
                                setDiscountType((product.discount_type as 'amount' | 'percentage') || 'amount');
                                setIsLimitedSale(!!product.sale_end_time);
                                setSaleEndTime(product.sale_end_time ? new Date(product.sale_end_time).toISOString().slice(0, 16) : '');
                                setVariants(product.variants.map(v => ({
                                  id: v.id,
                                  quantity: v.quantity,
                                  price: v.price,
                                  wholesalePrice: (v as any).wholesale_price || 0,
                                  isDefault: v.is_default || false,
                                  stockQuantity: v.stock_quantity,
                                })));
                                setDeliveryCharge(String((product as any).delivery_charge ?? 0));
                                setFreeDeliveryQuantity(String((product as any).free_delivery_quantity ?? 0));
                                setUnlimitedStock(Boolean((product as any).unlimited_stock));
                                const { data: tiersData } = await supabase
                                  .from('product_wholesale_tiers')
                                  .select('min_quantity, price')
                                  .eq('product_id', product.id)
                                  .order('min_quantity');
                                setWholesaleTiers((tiersData || []).map((t: any) => ({ minQuantity: t.min_quantity, price: Number(t.price) })));
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{product.name}" and all its variants and images. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteProduct(product.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            Variants: {product.variants.map(v => `${v.quantity}${product.measurement_unit} = ₹${v.price}${(product as any).unlimited_stock ? '' : ` (Stock: ${v.stock_quantity})`}`).join(', ')}
                          </div>
                          <div className="text-sm font-medium">
                            {(product as any).unlimited_stock
                              ? '♾️ Unlimited stock'
                              : `📦 Total Stock: ${product.variants.reduce((sum, v) => sum + v.stock_quantity, 0)} units`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Add Product Tab */}
          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {editingProduct ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </CardTitle>
                {editingProduct && (
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    Cancel Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g. Organic Turmeric Powder"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={productCategory} onValueChange={setProductCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Enter product description"
                    rows={4}
                  />
                </div>

                <p className="text-xs text-muted-foreground -mt-2">
                  Base price is auto-calculated from the lowest variant price you add below.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Measurement Unit</Label>
                    <Select value={measurementUnit} onValueChange={setMeasurementUnit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEASUREMENT_UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Packing Type</Label>
                    <Select value={packingType} onValueChange={setPackingType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {packingTypes.map((type) => (
                          <SelectItem key={type.id} value={type.name} className="capitalize">{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sale Settings */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="flex items-center gap-4">
                    <Switch checked={isOnSale} onCheckedChange={setIsOnSale} />
                    <Label>Enable Sale / Discount</Label>
                  </div>
                  {isOnSale && (
                    <>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label>Discount Type:</Label>
                          <Select value={discountType} onValueChange={(v: 'amount' | 'percentage') => setDiscountType(v)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="amount">Amount (₹)</SelectItem>
                              <SelectItem value="percentage">Percentage (%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label>{discountType === 'amount' ? 'Amount (₹)' : 'Percentage (%)'}</Label>
                          <Input
                            type="number"
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            placeholder={discountType === 'amount' ? 'e.g. 20' : 'e.g. 10'}
                            className="w-24"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch checked={isLimitedSale} onCheckedChange={setIsLimitedSale} />
                          <Label>Limited Time Sale</Label>
                        </div>
                        {isLimitedSale && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <Input
                              type="datetime-local"
                              value={saleEndTime}
                              onChange={(e) => setSaleEndTime(e.target.value)}
                              className="w-auto"
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Variants */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Product Variants (Size/Quantity Options)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                      <Plus className="w-4 h-4 mr-1" /> Add Variant
                    </Button>
                  </div>
                  {variants.map((variant, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-[100px]">
                        <Label className="text-xs">Quantity ({measurementUnit})</Label>
                        <Input
                          type="number"
                          value={variant.quantity}
                          onChange={(e) => updateVariant(index, 'quantity', parseFloat(e.target.value))}
                          placeholder="50"
                        />
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <Label className="text-xs">Price (₹)</Label>
                        <Input
                          type="number"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value))}
                          placeholder="50"
                        />
                      </div>
                      {!unlimitedStock && (
                        <div className="flex-1 min-w-[100px]">
                          <Label className="text-xs">Stock Qty</Label>
                          <Input
                            type="number"
                            value={variant.stockQuantity}
                            onChange={(e) => updateVariant(index, 'stockQuantity', parseFloat(e.target.value))}
                            placeholder="100"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={variant.isDefault}
                          onChange={() => updateVariant(index, 'isDefault', true)}
                          className="w-4 h-4"
                        />
                        <Label className="text-xs">Default</Label>
                      </div>
                      {variants.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVariant(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Unlimited stock toggle */}
                <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-sm font-semibold">♾️ Unlimited Stock</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enable for products that never run out (services, made-to-order, digital). Hides stock inputs and low-stock alerts.
                    </p>
                  </div>
                  <Switch checked={unlimitedStock} onCheckedChange={setUnlimitedStock} />
                </div>

                {/* Delivery Charge */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <Label className="text-sm font-semibold">Delivery Charges</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Delivery charge (₹)</Label>
                      <Input
                        type="number"
                        value={deliveryCharge}
                        onChange={(e) => setDeliveryCharge(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Free delivery when quantity ≥</Label>
                      <Input
                        type="number"
                        value={freeDeliveryQuantity}
                        onChange={(e) => setFreeDeliveryQuantity(e.target.value)}
                        placeholder="0 (always charge)"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    0 quantity = delivery is always charged. Otherwise charge is waived once buyer reaches that quantity of this product.
                  </p>
                </div>

                {/* Wholesale Tiers */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Wholesale Price Tiers</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setWholesaleTiers([...wholesaleTiers, { minQuantity: 5, price: 0 }])}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Tier
                    </Button>
                  </div>
                  {wholesaleTiers.length === 0 && (
                    <p className="text-xs text-muted-foreground">No tiers. Add a tier so buyers get a lower price when they order more.</p>
                  )}
                  {wholesaleTiers.map((tier, idx) => (
                    <div key={idx} className="flex flex-wrap items-end gap-3 p-3 bg-background rounded-md">
                      <div className="flex-1 min-w-[100px]">
                        <Label className="text-xs">Min Quantity</Label>
                        <Input
                          type="number"
                          value={tier.minQuantity}
                          onChange={(e) => {
                            const v = parseInt(e.target.value) || 0;
                            setWholesaleTiers(wholesaleTiers.map((t, i) => i === idx ? { ...t, minQuantity: v } : t));
                          }}
                          placeholder="5"
                        />
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <Label className="text-xs">Price per unit (₹)</Label>
                        <Input
                          type="number"
                          value={tier.price}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setWholesaleTiers(wholesaleTiers.map((t, i) => i === idx ? { ...t, price: v } : t));
                          }}
                          placeholder="0"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setWholesaleTiers(wholesaleTiers.filter((_, i) => i !== idx))}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Images */}
                <div className="space-y-4">
                  <Label>Product Images</Label>
                  
                  {/* Existing images (when editing) */}
                  {editingProduct && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Current Images</p>
                      <div className="flex flex-wrap gap-4">
                        {editingProduct.images.map((img, index) => (
                          <div key={img.id} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                            <img
                              src={img.image_url}
                              alt={`Existing ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 w-6 h-6"
                              onClick={() => deleteExistingImage(img.id, img.image_url, editingProduct.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            {img.is_primary && (
                              <Badge className="absolute bottom-1 left-1 text-xs">Primary</Badge>
                            )}
                          </div>
                        ))}
                        <label className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                          <Plus className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground mt-1">Add</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                addImageToExistingProduct(e.target.files, editingProduct.id);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* New images (for new products or additional uploads) */}
                  {!editingProduct && (
                    <div className="flex flex-wrap gap-4">
                      {productImages.map((file, index) => (
                        <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 w-6 h-6"
                            onClick={() => removeImage(index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          {index === 0 && (
                            <Badge className="absolute bottom-1 left-1 text-xs">Primary</Badge>
                          )}
                        </div>
                      ))}
                      <label className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageSelect}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <Button
                  onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                  disabled={uploading}
                  className="w-full gradient-hero text-primary-foreground"
                >
                  {uploading 
                    ? (editingProduct ? 'Updating Product...' : 'Adding Product...') 
                    : (editingProduct ? 'Update Product' : 'Create Product')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <SalesReportDashboard sellerId={!isAdmin && isSeller ? user?.id : undefined} />
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  All Users & Sellers ({customers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No customers yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Orders</TableHead>
                          <TableHead>Loyalty</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.map((customer, idx) => {
                          const customerOrders = orders.filter(o => o.user_id === customer.user_id);
                          const totalSpent = customerOrders.reduce((sum, o) => sum + o.total, 0);
                          const loyaltyEnabled = customer.loyalty_enabled !== false;
                          const role = customerRoles[customer.user_id] || 'user';
                          const isBlocked = customer.is_blocked || false;
                          return (
                            <TableRow key={customer.user_id} className={isBlocked ? 'opacity-50' : ''}>
                              <TableCell className="font-medium">{idx + 1}</TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{customer.full_name || 'N/A'}</p>
                                  <p className="text-xs text-muted-foreground">{customer.phone || 'N/A'}</p>
                                </div>
                              </TableCell>
                              <TableCell>{customer.phone || 'N/A'}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant={role === 'admin' ? 'default' : role === 'seller' ? 'secondary' : 'outline'} className="text-xs w-fit">
                                    {role === 'admin' ? '👑 Admin' : role === 'seller' ? '🏪 Seller' : '👤 User'}
                                  </Badge>
                                  <div className="flex items-center gap-2">
                                    {role !== 'admin' && (
                                      <>
                                        <div className="flex items-center gap-1">
                                          <Switch
                                            checked={role === 'seller'}
                                            onCheckedChange={async (checked) => {
                                              if (checked) {
                                                await supabase.from('user_roles').upsert({ user_id: customer.user_id, role: 'seller' } as any, { onConflict: 'user_id,role' });
                                              } else {
                                                await supabase.from('user_roles').delete().eq('user_id', customer.user_id).eq('role', 'seller');
                                              }
                                              setCustomerRoles(prev => ({ ...prev, [customer.user_id]: checked ? 'seller' : 'user' }));
                                              toast({ title: checked ? '🏪 Seller access granted' : '👤 Reverted to user' });
                                            }}
                                          />
                                          <span className="text-[10px] text-muted-foreground">Seller</span>
                                        </div>
                                      </>
                                    )}
                                    {isOwner && role !== 'admin' && (
                                      <div className="flex items-center gap-1">
                                        <Switch
                                          checked={false}
                                          onCheckedChange={async (checked) => {
                                            if (checked) {
                                              await supabase.from('user_roles').upsert({ user_id: customer.user_id, role: 'admin' } as any, { onConflict: 'user_id,role' });
                                              setCustomerRoles(prev => ({ ...prev, [customer.user_id]: 'admin' }));
                                              toast({ title: '👑 Admin access granted' });
                                            }
                                          }}
                                        />
                                        <span className="text-[10px] text-muted-foreground">Admin</span>
                                      </div>
                                    )}
                                    {isOwner && role === 'admin' && customer.user_id !== user?.id && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-destructive"
                                        onClick={async () => {
                                          await supabase.from('user_roles').delete().eq('user_id', customer.user_id).eq('role', 'admin');
                                          setCustomerRoles(prev => ({ ...prev, [customer.user_id]: 'user' }));
                                          toast({ title: '👤 Admin access revoked' });
                                        }}
                                      >
                                        Remove Admin
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <span className="font-medium">{customerOrders.length}</span> orders
                                  <span className="text-muted-foreground ml-2">₹{totalSpent.toFixed(0)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={loyaltyEnabled}
                                  onCheckedChange={async (checked) => {
                                    const { error } = await supabase
                                      .from('profiles')
                                      .update({ loyalty_enabled: checked } as any)
                                      .eq('user_id', customer.user_id);
                                    if (!error) {
                                      setCustomers(prev => prev.map(c =>
                                        c.user_id === customer.user_id ? { ...c, loyalty_enabled: checked } : c
                                      ));
                                      toast({ title: checked ? 'Loyalty Enabled' : 'Loyalty Disabled' });
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                {isBlocked ? (
                                  <Badge variant="destructive" className="text-xs">🚫 Blocked</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-primary">✅ Active</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {/* Block/Unblock */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 ${isBlocked ? 'text-primary hover:bg-primary/10' : 'text-destructive hover:bg-destructive/10'}`}
                                    onClick={async () => {
                                      await supabase.from('profiles').update({ is_blocked: !isBlocked } as any).eq('user_id', customer.user_id);
                                      setCustomers(prev => prev.map(c => c.user_id === customer.user_id ? { ...c, is_blocked: !isBlocked } : c));
                                      toast({ title: isBlocked ? '✅ User unblocked' : '🚫 User blocked' });
                                    }}
                                    title={isBlocked ? 'Unblock' : 'Block'}
                                  >
                                    {isBlocked ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                  </Button>
                                  {/* Delete */}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete {customer.full_name || 'this user'}?</AlertDialogTitle>
                                        <AlertDialogDescription>This will remove their profile. They will need to sign up again.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={async () => {
                                          try {
                                            const { data: { session } } = await supabase.auth.getSession();
                                            const res = await supabase.functions.invoke('delete-user', {
                                              body: { user_id: customer.user_id },
                                            });
                                            if (res.error) throw res.error;
                                            setCustomers(prev => prev.filter(c => c.user_id !== customer.user_id));
                                            toast({ title: '🗑️ User deleted from database' });
                                          } catch (err: any) {
                                            toast({ title: 'Error deleting user', description: err.message, variant: 'destructive' });
                                          }
                                        }}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Categories Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Categories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="e.g. Spices, Snacks"
                    />
                    <Button onClick={addCategory} disabled={!newCategory.trim()}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Badge key={cat.id} variant="outline" className="flex items-center gap-1 pr-1">
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Packing Types Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Packing Types
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newPackingType}
                      onChange={(e) => setNewPackingType(e.target.value)}
                      placeholder="e.g. pouch, box, jar"
                    />
                    <Button onClick={addPackingType} disabled={!newPackingType.trim()}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {packingTypes.map((type) => (
                      <Badge key={type.id} variant="outline" className="capitalize flex items-center gap-1 pr-1">
                        {type.name}
                        {isAdmin && (
                          <button
                            onClick={() => deletePackingType(type.id)}
                            className="ml-1 p-0.5 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default SellerDashboard;
