import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '@/types/product';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';

interface CartItemProps {
  item: CartItemType;
}

const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart();

  // Generate cart item ID for removal/update
  const cartItemId = item.selectedVariant 
    ? `${item.id}-${item.selectedVariant.weight}` 
    : item.id;

  const price = item.selectedVariant ? item.selectedVariant.price : item.price;

  return (
    <div className="flex gap-4 p-4 bg-card rounded-lg shadow-soft animate-fade-in">
      <img
        src={item.image}
        alt={item.name}
        className="w-20 h-20 object-cover rounded-md"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-serif font-semibold text-foreground truncate">
          {item.name}
          {item.selectedVariant && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({item.selectedVariant.weight})
            </span>
          )}
        </h3>
        <p className="text-sm text-muted-foreground">
          ₹{price} × {item.quantity} = <span className="font-semibold text-primary">₹{price * item.quantity}</span>
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => updateQuantity(cartItemId, item.quantity - 1)}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => updateQuantity(cartItemId, item.quantity + 1)}
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => removeFromCart(cartItemId)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
