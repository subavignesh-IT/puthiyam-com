import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/product';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import ProductCard from '@/components/ProductCard';

interface TrendingProduct extends Product {
  purchaseCount: number;
}

const Trending: React.FC = () => {
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingProducts();
  }, []);

  const fetchTrendingProducts = async () => {
    try {
      // Fetch all orders from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('items')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (ordersError) throw ordersError;

      // Count product purchases from orders
      const productCounts: Record<string, number> = {};
      orders?.forEach((order) => {
        const items = order.items as Array<{ id: string; quantity: number }>;
        items.forEach((item) => {
          productCounts[item.id] = (productCounts[item.id] || 0) + item.quantity;
        });
      });

      // Fetch all active products from database
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('is_in_stock', true);

      if (productsError) throw productsError;

      // Fetch variants and images for each product
      const productsWithDetails: TrendingProduct[] = await Promise.all(
        (productsData || []).map(async (product) => {
          const [variantsRes, imagesRes] = await Promise.all([
            supabase.from('product_variants').select('*').eq('product_id', product.id).order('price'),
            supabase.from('product_images').select('*').eq('product_id', product.id).order('display_order'),
          ]);

          const variants = variantsRes.data || [];
          const images = imagesRes.data || [];
          const primaryImage = images.find(img => img.is_primary) || images[0];
          const defaultVariant = variants.find(v => v.is_default) || variants[0];

          // Check if sale has expired
          const saleEndTime = product.sale_end_time;
          const isSaleExpired = saleEndTime && new Date(saleEndTime) < new Date();
          const isOnSale = product.is_on_sale && !isSaleExpired;

          return {
            id: product.id,
            name: product.name,
            price: defaultVariant?.price || product.base_price,
            category: product.category,
            image: primaryImage?.image_url || '/placeholder.svg',
            description: product.description || '',
            rating: 0,
            reviewCount: 0,
            variants: variants.map(v => ({
              weight: `${v.quantity}${product.measurement_unit}`,
              price: v.price,
            })),
            isInStock: product.is_in_stock,
            isOnSale: isOnSale,
            discountAmount: product.discount_amount,
            discountType: (product.discount_type as 'amount' | 'percentage') || 'amount',
            saleEndTime: saleEndTime,
            purchaseCount: productCounts[product.id] || 0,
          };
        })
      );

      // Sort by purchase count and get top 10
      const trending = productsWithDetails
        .sort((a, b) => b.purchaseCount - a.purchaseCount)
        .slice(0, 10);

      setTrendingProducts(trending);
    } catch (error) {
      console.error('Error fetching trending products:', error);
      setTrendingProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-2 rounded-full mb-4">
            <Flame className="w-5 h-5 text-destructive animate-pulse-soft" />
            <span className="text-sm font-medium text-primary">Hot & Trending</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
            Trending Products
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Most loved products by our customers in the last 30 days
          </p>
        </div>

        {/* Trending Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : trendingProducts.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No trending data yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back later to see what's popular!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {trendingProducts.map((product, index) => (
              <div key={product.id} className="relative">
                {index < 3 && (
                  <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-destructive to-primary text-white text-xs font-bold px-2 py-1 rounded-full animate-pop-in flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    #{index + 1}
                  </div>
                )}
                <ProductCard product={product} />
                {product.purchaseCount > 0 && (
                  <div className="text-center mt-2 text-xs text-muted-foreground">
                    🔥 {product.purchaseCount} purchased recently
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default Trending;
