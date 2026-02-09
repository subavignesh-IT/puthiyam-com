import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CategoryFilter from '@/components/CategoryFilter';
import BottomNav from '@/components/BottomNav';
import { Product } from '@/types/product';
import { subDays } from 'date-fns';

const Index: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [productSalesCount, setProductSalesCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['All']);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchProductSalesCount();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .order('name');

    if (!error && data) {
      setCategories(['All', ...data.map(c => c.name)]);
    }
  };

  // Fetch sales count for each product from orders (last 30 days)
  const fetchProductSalesCount = async () => {
    try {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('items')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      const salesCount: Record<string, number> = {};
      (ordersData || []).forEach((order: { items: unknown }) => {
        const items = order.items as Array<{ id: string; quantity: number }>;
        items.forEach(item => {
          salesCount[item.id] = (salesCount[item.id] || 0) + item.quantity;
        });
      });

      setProductSalesCount(salesCount);
    } catch (error) {
      console.error('Error fetching product sales count:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      // Fetch active products from database (including out of stock to show with label)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Fetch variants and images for each product
      const productsWithDetails: Product[] = await Promise.all(
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
          const saleEndTime = (product as any).sale_end_time;
          const isSaleExpired = saleEndTime && new Date(saleEndTime) < new Date();
          const isOnSale = product.is_on_sale && !isSaleExpired;

          // Calculate total stock from all variants
          const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

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
              stockQuantity: v.stock_quantity,
            })),
            isInStock: product.is_in_stock,
            isOnSale: isOnSale,
            discountAmount: isOnSale ? product.discount_amount : 0,
            discountType: (product as any).discount_type || 'amount',
            saleEndTime: isOnSale ? saleEndTime : null,
            totalStock: totalStock,
          };
        })
      );

      setDbProducts(productsWithDetails);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sort products: least selling first to increase their visibility
  const sortedProducts = useMemo(() => {
    return [...dbProducts].sort((a, b) => {
      const aSales = productSalesCount[a.id] || 0;
      const bSales = productSalesCount[b.id] || 0;
      return aSales - bSales; // Ascending: least selling first
    });
  }, [dbProducts, productSalesCount]);

  const filteredProducts = useMemo(() => {
    return sortedProducts.filter(product => {
      // Show all products including out of stock (they'll have a label)
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, sortedProducts]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header onSearch={setSearchQuery} searchQuery={searchQuery} />
      
      <main className="container mx-auto px-4 py-8">
        <section className="mb-12 text-center">
          <div className="gradient-hero rounded-2xl p-8 md:p-12 text-primary-foreground">
            <h1 className="font-serif text-3xl md:text-5xl font-bold mb-4 animate-fade-in">
              Welcome to PUTHIYAM PRODUCTS
            </h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto animate-fade-in">
              Discover authentic, quality products delivered with love.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <CategoryFilter 
            selectedCategory={selectedCategory} 
            onCategoryChange={setSelectedCategory}
            categories={categories}
          />
        </section>

        <section className="mb-16">
          <h2 className="font-serif text-2xl font-bold mb-6">
            {selectedCategory === 'All' ? 'All Products' : selectedCategory}
            <span className="text-muted-foreground text-base font-normal ml-2">({filteredProducts.length} items)</span>
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No products found. Try a different search or category.</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default Index;
