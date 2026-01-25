import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Info, ShoppingCart, Phone, ClipboardList, TrendingUp } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/about', icon: Info, label: 'About' },
    { path: '/cart', icon: ShoppingCart, label: 'Cart', badge: itemCount },
    { path: '/contact', icon: Phone, label: 'Contact' },
    { path: '/orders', icon: ClipboardList, label: 'My Order' },
    { path: '/trending', icon: TrendingUp, label: 'Trending' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-elevated safe-area-bottom">
      <div className="grid grid-cols-6 h-16">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-0.5 relative transition-all duration-300 ease-out
              ${isActive(item.path) 
                ? 'text-primary scale-110' 
                : 'text-muted-foreground hover:text-foreground hover:scale-105'
              }
              active:scale-95
            `}
          >
            <div className="relative">
              <item.icon 
                className={`w-5 h-5 transition-all duration-300 ${
                  isActive(item.path) ? 'drop-shadow-[0_0_8px_hsl(var(--primary))]' : ''
                }`} 
              />
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full animate-pop-in">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium transition-all duration-300 ${
              isActive(item.path) ? 'font-semibold' : ''
            }`}>
              {item.label}
            </span>
            {isActive(item.path) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full animate-fade-in" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
