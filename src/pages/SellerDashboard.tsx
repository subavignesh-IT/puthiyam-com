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
import { Package, Plus, Trash2, Upload, ShoppingCart, Edit, Tag, Percent, Settings } from 'lucide-react';
import { DbProduct, DbProductVariant, DbProductImage } from '@/types/product';

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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');

  // Product form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('g');
  const [packingType, setPackingType] = useState('pouch');
  const [isOnSale, setIsOnSale] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
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
    ]);
    setLoading(false);
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
      const { error } = await supabase
        .from('products')
        .update({ is_on_sale: isOnSale })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, is_on_sale: isOnSale } : p
      ));

      toast({
        title: isOnSale ? "Sale Enabled" : "Sale Disabled",
      });
    } catch (error) {
      console.error('Error updating sale status:', error);
    }
  };

  const updateProductDiscount = async (productId: string, discount: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ discount_amount: discount })
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, discount_amount: discount } : p
      ));

      toast({ title: "Discount Updated" });
    } catch (error) {
      console.error('Error updating discount:', error);
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
      setProductName('');
      setProductDescription('');
      setProductCategory('');
      setBasePrice('');
      setMeasurementUnit('g');
      setPackingType('pouch');
      setIsOnSale(false);
      setDiscountAmount('');
      setVariants([{ quantity: 50, price: 50, isDefault: true, stockQuantity: 100 }]);
      setProductImages([]);

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add New</span>
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
                              <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                                {order.payment_status}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">{order.payment_method}</p>
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
                                <Badge variant="secondary" className="bg-red-500 text-white">
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
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  className="w-20 h-8"
                                  value={product.discount_amount}
                                  onChange={(e) => updateProductDiscount(product.id, parseFloat(e.target.value) || 0)}
                                  placeholder="₹"
                                />
                                <span className="text-sm text-muted-foreground">off</span>
                              </div>
                            )}

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
                            Variants: {product.variants.map(v => `${v.quantity}${product.measurement_unit} = ₹${v.price}`).join(', ')}
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Product
                </CardTitle>
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
                      placeholder="Enter product name"
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
                    <div className="flex items-center gap-2">
                      <Label>Discount Amount (₹)</Label>
                      <Input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        placeholder="e.g. 20"
                        className="w-32"
                      />
                    </div>
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
                  onClick={handleAddProduct}
                  disabled={uploading}
                  className="w-full gradient-hero text-primary-foreground"
                >
                  {uploading ? 'Adding Product...' : 'Create Product'}
                </Button>
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
                      placeholder="New category name"
                    />
                    <Button onClick={addCategory} disabled={!newCategory.trim()}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Badge key={cat.id} variant="outline">{cat.name}</Badge>
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
                      placeholder="New packing type"
                    />
                    <Button onClick={addPackingType} disabled={!newPackingType.trim()}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {packingTypes.map((type) => (
                      <Badge key={type.id} variant="outline" className="capitalize">{type.name}</Badge>
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
