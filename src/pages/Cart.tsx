import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartItem from '@/components/CartItem';
import CheckoutForm from '@/components/CheckoutForm';
import { Button } from '@/components/ui/button';

const Cart: React.FC = () => {
  const { items, getTotal } = useCart();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Continue Shopping
            </Button>
          </Link>
        </div>

        <h1 className="font-serif text-3xl font-bold mb-8">Your Cart</h1>

        {items.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="font-serif text-2xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some products to get started!</p>
            <Link to="/">
              <Button className="gradient-hero text-primary-foreground">
                Browse Products
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Cart Items */}
            <div className="space-y-4">
              <h2 className="font-serif text-xl font-semibold mb-4">
                Items ({items.length})
              </h2>
              {items.map(item => (
                <CartItem key={item.id} item={item} />
              ))}
              
              {/* Price Breakdown */}
              <div className="bg-muted/50 rounded-lg p-4 mt-6">
                <h3 className="font-semibold mb-3">Price Details</h3>
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>{item.name}</span>
                    <span>₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="border-t border-border mt-3 pt-3 flex justify-between font-semibold">
                  <span>Subtotal</span>
                  <span className="text-primary">₹{getTotal()}</span>
                </div>
              </div>
            </div>

            {/* Checkout Form */}
            <div>
              <CheckoutForm />
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Cart;
