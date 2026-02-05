import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product, CartItem, ProductVariant } from '@/types/product';
import { toast } from '@/hooks/use-toast';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getShippingCost: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Generate a unique cart item ID based on product ID and variant
  const generateCartItemId = (productId: string, variant?: ProductVariant) => {
    if (variant) {
      return `${productId}-${variant.weight}`;
    }
    return productId;
  };

  const addToCart = useCallback((product: Product, variant?: ProductVariant) => {
    const cartItemId = generateCartItemId(product.id, variant);
    
    setItems(prev => {
      const existing = prev.find(item => {
        // Match by product ID AND variant weight
        if (variant && item.selectedVariant) {
          return item.id === product.id && item.selectedVariant.weight === variant.weight;
        }
        // If no variant, just match by product ID and no selected variant
        return item.id === product.id && !item.selectedVariant;
      });

      if (existing) {
        return prev.map(item => {
          if (variant && item.selectedVariant) {
            if (item.id === product.id && item.selectedVariant.weight === variant.weight) {
              return { ...item, quantity: item.quantity + 1 };
            }
          } else if (!variant && !item.selectedVariant && item.id === product.id) {
            return { ...item, quantity: item.quantity + 1 };
          }
          return item;
        });
      }

      // Add as new cart item with variant info
      const newItem: CartItem = {
        ...product,
        quantity: 1,
        selectedVariant: variant,
        price: variant ? variant.price : product.price,
        cartItemId, // Unique identifier for this cart item
      };

      return [...prev, newItem];
    });

    const variantLabel = variant ? ` (${variant.weight})` : '';
    toast({
      title: "🛒 Item Added!",
      description: `${product.name}${variantLabel} has been added to your cart`,
      duration: 2000,
    });
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setItems(prev => prev.filter(item => {
      const itemCartId = generateCartItemId(item.id, item.selectedVariant);
      return itemCartId !== cartItemId;
    }));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setItems(prev =>
      prev.map(item => {
        const itemCartId = generateCartItemId(item.id, item.selectedVariant);
        return itemCartId === cartItemId ? { ...item, quantity } : item;
      })
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((sum, item) => {
      const price = item.selectedVariant ? item.selectedVariant.price : item.price;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const getShippingCost = useCallback(() => {
    const total = getTotal();
    return total < 200 ? 100 : 0;
  }, [getTotal]);

  const getItemCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
        getShippingCost,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
