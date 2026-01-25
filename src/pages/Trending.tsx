import React, { useState, useEffect } from 'react';
import { TrendingUp, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { products } from '@/data/products';
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

      const { data: orders, error } = await supabase
        .from('orders')
        .select('items')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      // Count product purchases
      const productCounts: Record<string, number> = {};

      orders?.forEach((order) => {
        const items = order.items as Array<{ id: string; quantity: number }>;
        items.forEach((item) => {
          productCounts[item.id] = (productCounts[item.id] || 0) + item.quantity;
        });
      });

      // Map to products with purchase counts
      const trending = products
        .map((product) => ({
          ...product,
          purchaseCount: productCounts[product.id] || 0,
        }))
        .sort((a, b) => b.purchaseCount - a.purchaseCount)
        .slice(0, 10);

      setTrendingProducts(trending);
    } catch (error) {
      console.error('Error fetching trending products:', error);
      // Fallback to showing all products if error
      setTrendingProducts(products.map(p => ({ ...p, purchaseCount: 0 })));
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
