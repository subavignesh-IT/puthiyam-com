import React from 'react';
import { Star, Plus } from 'lucide-react';
import { Product } from '@/types/product';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < Math.floor(rating)
            ? 'fill-accent text-accent'
            : i < rating
            ? 'fill-accent/50 text-accent'
            : 'text-muted'
        }`}
      />
    ));
  };

  return (
    <Card className="group overflow-hidden border-0 shadow-soft hover:shadow-elevated transition-all duration-300 animate-fade-in">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2">
          <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
            {product.category}
          </span>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-serif font-semibold text-foreground line-clamp-1 mb-1">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {product.description}
        </p>
        <div className="flex items-center gap-1 mb-3">
          {renderStars(product.rating)}
          <span className="text-xs text-muted-foreground ml-1">
            ({product.reviewCount})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">₹{product.price}</span>
          <Button
            size="sm"
            onClick={() => addToCart(product)}
            className="gradient-hero text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
