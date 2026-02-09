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
import { Package, Plus, Trash2, Upload, ShoppingCart, Edit, Tag, Percent, Settings, Clock, X, Share2, BarChart3, Bell, Download, DollarSign } from 'lucide-react';
import { DbProduct, DbProductVariant, DbProductImage } from '@/types/product';
import SalesReportDashboard from '@/components/SalesReportDashboard';
import OrderBillImage from '@/components/OrderBillImage';
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
}

interface ProductVariant {
  id?: string;
  quantity: number;
  price: number;
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

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [packingTypes, setPackingTypes] = useState<{ id: string; name: string }[]>([]);
  const [requestedProducts, setRequestedProducts] = useState<RequestedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);
  const billRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  // Product form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('g');
  const [packingType, setPackingType] = useState('pouch');
  const [isOnSale, setIsOnSale] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [isLimitedSale, setIsLimitedSale] = useState(false);
  const [saleEndTime, setSaleEndTime] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([
    { quantity: 50, price: 50, isDefault: true, stockQuantity: 100 },
  ]);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // New category/packing type form
  const [newCategory, setNewCategory] = useState('');
  const [newPackingType, setNewPackingType] = useState('');

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate('/login');
        return;
      }
      if (!isAdmin) {
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
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  const fetchData = async () => {
    await Promise.all([
      fetchOrders(),
      fetchProducts(),
      fetchCategories(),
      fetchPackingTypes(),
      fetchRequestedProducts(),
    ]);
    setLoading(false);
  };

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
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Fetch variants and images for each product
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
        
        // Download the image
        const link = document.createElement('a');
        link.download = `PUTHIYAM_Bill_${order.id.slice(0, 8)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Open WhatsApp with a summary
        const message = `🛒 *Order Bill from PUTHIYAM PRODUCTS*\n\n📋 Order: ${order.id.slice(0, 8).toUpperCase()}\n👤 Customer: ${order.customer_name}\n📞 Phone: ${order.customer_phone}\n💰 Total: ₹${order.total}\n${order.payment_status === 'paid' ? '✅ PAID' : '⏳ PENDING'}\n📦 Status: ${order.order_status.toUpperCase()}\n\n📎 Bill image attached`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/919361284773?text=${encodedMessage}`, '_blank');

        toast({ title: "Bill Generated", description: "Bill image downloaded and WhatsApp opened" });
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

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(prev => prev.filter(c => c.id !== categoryId));
      toast({ title: "Category Deleted" });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
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
    setVariants([...variants, { quantity: 100, price: 100, isDefault: false, stockQuantity: 100 }]);
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
    if (!productName || !productCategory || !basePrice) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
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
          base_price: parseFloat(basePrice),
          measurement_unit: measurementUnit,
          packing_type: packingType,
          is_on_sale: isOnSale,
          discount_amount: parseFloat(discountAmount) || 0,
          discount_type: discountType,
          sale_end_time: isLimitedSale && saleEndTime ? new Date(saleEndTime).toISOString() : null,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Add variants
      const variantInserts = variants.map(v => ({
        product_id: product.id,
        quantity: v.quantity,
        price: v.price,
        is_default: v.isDefault,
        stock_quantity: v.stockQuantity,
      }));

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantInserts);

      if (variantError) throw variantError;

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
    setBasePrice('');
    setMeasurementUnit('g');
    setPackingType('pouch');
    setIsOnSale(false);
    setDiscountAmount('');
    setDiscountType('amount');
    setIsLimitedSale(false);
    setSaleEndTime('');
    setVariants([{ quantity: 50, price: 50, isDefault: true, stockQuantity: 100 }]);
    setProductImages([]);
    setEditingProduct(null);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !productName || !productCategory || !basePrice) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
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
          base_price: parseFloat(basePrice),
          measurement_unit: measurementUnit,
          packing_type: packingType,
          is_on_sale: isOnSale,
          discount_amount: parseFloat(discountAmount) || 0,
          discount_type: discountType,
          sale_end_time: isLimitedSale && saleEndTime ? new Date(saleEndTime).toISOString() : null,
        })
        .eq('id', editingProduct.id);

      if (productError) throw productError;

      // Update variants - delete old ones and insert new ones
      await supabase.from('product_variants').delete().eq('product_id', editingProduct.id);
      
      const variantInserts = variants.map(v => ({
        product_id: editingProduct.id,
        quantity: v.quantity,
        price: v.price,
        is_default: v.isDefault,
        stock_quantity: v.stockQuantity,
      }));

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantInserts);

      if (variantError) throw variantError;

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Requests</span>
              {requestedProducts.length > 0 && (
                <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {requestedProducts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add New</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  All Orders ({orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No orders yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                        {orders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="text-sm">
                              {formatDate(order.created_at)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.customer_name}</p>
                                <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                                {order.customer_address && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {order.customer_address}
                                  </p>
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
                                <Select
                                  value={order.payment_status}
                                  onValueChange={(value) => updatePaymentStatus(order.id, value)}
                                >
                                  <SelectTrigger className="w-24 h-7">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PAYMENT_STATUSES.map((status) => (
                                      <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">{order.payment_method}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(order.order_status)} text-white`}>
                                {order.order_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={order.order_status}
                                  onValueChange={(value) => updateOrderStatus(order.id, value)}
                                >
                                  <SelectTrigger className="w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ORDER_STATUSES.map((status) => (
                                      <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => shareOrderBill(order)}
                                  title="Share Bill"
                                >
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
                                      <AlertDialogDescription>
                                        This will permanently delete this order. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteOrder(order.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                              {/* Hidden Bill Image for this order */}
                              <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                                <OrderBillImage
                                  ref={(el) => { billRefs.current[order.id] = el; }}
                                  orderId={order.id}
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
                              onClick={() => {
                                setEditingProduct(product);
                                setActiveTab('add');
                                // Pre-fill form with product data
                                setProductName(product.name);
                                setProductDescription(product.description || '');
                                setProductCategory(product.category);
                                setBasePrice(product.base_price.toString());
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
                                  isDefault: v.is_default || false,
                                  stockQuantity: v.stock_quantity,
                                })));
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
                            Variants: {product.variants.map(v => `${v.quantity}${product.measurement_unit} = ₹${v.price} (Stock: ${v.stock_quantity})`).join(', ')}
                          </div>
                          <div className="text-sm font-medium">
                            📦 Total Stock: {product.variants.reduce((sum, v) => sum + v.stock_quantity, 0)} units
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

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="basePrice">Base Price (₹) *</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="e.g. 100"
                    />
                  </div>
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
                      <div className="flex-1 min-w-[100px]">
                        <Label className="text-xs">Stock Qty</Label>
                        <Input
                          type="number"
                          value={variant.stockQuantity}
                          onChange={(e) => updateVariant(index, 'stockQuantity', parseFloat(e.target.value))}
                          placeholder="100"
                        />
                      </div>
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

                {/* Images */}
                <div className="space-y-4">
                  <Label>Product Images</Label>
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
            <SalesReportDashboard />
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
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="ml-1 p-0.5 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
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
                        <button
                          onClick={() => deletePackingType(type.id)}
                          className="ml-1 p-0.5 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
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
