import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/types/product';
import { Card, CardContent } from '@/components/ui/card';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  // Get the lowest price from variants or use base price
  const displayPrice = product.variants && product.variants.length > 0
    ? product.variants[0].price
    : product.price;

  return (
    <Card 
      className="group overflow-hidden border-0 shadow-soft hover:shadow-elevated transition-all duration-300 animate-fade-in cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      onClick={handleCardClick}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2">
          <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full shadow-sm">
            {product.category}
          </span>
        </div>
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
            <span className="text-lg font-bold text-primary">₹{displayPrice}</span>
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
