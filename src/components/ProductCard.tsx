import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/types/product';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Percent, AlertTriangle } from 'lucide-react';
import SaleCountdownTimer from './SaleCountdownTimer';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const [saleExpired, setSaleExpired] = useState(false);

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleSaleExpired = useCallback(() => {
    setSaleExpired(true);
  }, []);

  // Get the lowest price from variants or use base price
  const displayPrice = product.variants && product.variants.length > 0
    ? product.variants[0].price
    : product.price;

  // Calculate discounted price if on sale (and sale hasn't expired locally)
  const isOnSale = product.isOnSale && !saleExpired;
  const calculateFinalPrice = () => {
    if (!isOnSale || !product.discountAmount) return displayPrice;
    if (product.discountType === 'percentage') {
      return Math.max(0, Math.round(displayPrice - (displayPrice * product.discountAmount / 100)));
    }
    return Math.max(0, displayPrice - product.discountAmount);
  };
  const finalPrice = calculateFinalPrice();

  // Check if it's a limited time sale (and not expired)
  const hasLimitedSale = isOnSale && product.saleEndTime;

  // Calculate total stock from variants
  const totalStock = product.totalStock || 0;
  const showLimitedStock = totalStock > 0 && totalStock <= 5;

  return (
    <Card 
      className="group overflow-hidden border-0 shadow-soft hover:shadow-elevated transition-all duration-300 animate-fade-in cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      onClick={handleCardClick}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain bg-white group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isOnSale && product.discountAmount && product.discountAmount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-xs shadow-lg">
              <Percent className="w-3 h-3 mr-1" />
              {product.discountType === 'percentage' ? `${product.discountAmount}%` : `₹${product.discountAmount}`} OFF
            </Badge>
          )}
          {product.isInStock === false && (
            <Badge variant="destructive" className="text-xs">
              Out of Stock
            </Badge>
          )}
          {showLimitedStock && product.isInStock !== false && (
            <Badge variant="secondary" className="text-xs bg-orange-500 text-white">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Only {totalStock} left!
            </Badge>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full shadow-sm">
            {product.category}
          </span>
        </div>
        {/* Limited sale timer - bottom right, highlighted */}
        {hasLimitedSale && (
          <div className="absolute bottom-2 right-2 animate-pulse">
            <SaleCountdownTimer 
              endTime={product.saleEndTime!} 
              compact 
              productId={product.id}
              onExpired={handleSaleExpired}
            />
          </div>
        )}
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <CardContent className="p-4">
        <h3 className="font-serif font-semibold text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {product.description}
        </p>
        <div className="flex items-center justify-between">
          <div>
            {isOnSale && product.discountAmount && product.discountAmount > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">₹{finalPrice}</span>
                <span className="text-sm text-muted-foreground line-through">₹{displayPrice}</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-primary">₹{displayPrice}</span>
            )}
            {product.variants && product.variants.length > 0 && (
              <span className="text-xs text-muted-foreground ml-1">
                ({product.variants[0].weight})
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            View Details
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
