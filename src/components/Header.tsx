import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, LogOut, ClipboardList, ChevronDown, Store } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

const Header: React.FC<HeaderProps> = ({ onSearch, searchQuery = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('has_role', { _user_id: user.id, _role: 'admin' });

        if (!error && data === true) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        setIsAdmin(false);
      }
    };

    checkAdminRole();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getUserInitial = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const getUserEmail = () => {
    return user?.email || '';
  };

  const LogoButton = () => (
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 gradient-hero rounded-full flex items-center justify-center shadow-soft hover:shadow-elevated transition-all duration-300 hover:scale-105">
        <span className="text-primary-foreground font-serif font-bold text-xl">P</span>
      </div>
      <span className="font-serif font-bold text-lg text-foreground hidden sm:block">
        PUTHIYAM
      </span>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <LogoButton />
          </Link>

          {/* Search Bar - Desktop */}
          {onSearch && (
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  className="pl-10 bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  value={searchQuery}
                  onChange={(e) => onSearch(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* User Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 px-2 hover:bg-muted/50 transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <div className="w-9 h-9 gradient-hero rounded-full flex items-center justify-center shadow-soft">
                      <span className="text-primary-foreground font-bold text-sm">
                        {getUserInitial()}
                      </span>
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium leading-none">{getUserName()}</p>
                      <p className="text-xs text-muted-foreground leading-none mt-0.5">{getUserEmail()}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover shadow-elevated animate-fade-in">
                  <div className="px-3 py-2 sm:hidden">
                    <p className="text-sm font-medium">{getUserName()}</p>
                    <p className="text-xs text-muted-foreground">{getUserEmail()}</p>
                  </div>
                  <DropdownMenuSeparator className="sm:hidden" />
                  <DropdownMenuItem 
                    onClick={() => navigate('/orders')}
                    className="cursor-pointer hover:bg-muted transition-colors"
                  >
                    <ClipboardList className="w-4 h-4 mr-2" />
                    My Orders
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem 
                      onClick={() => navigate('/seller')}
                      className="cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Store className="w-4 h-4 mr-2" />
                      Seller Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                className="gradient-hero text-primary-foreground hover:scale-105 active:scale-95 transition-transform duration-200 shadow-soft"
              >
                <User className="w-4 h-4 mr-2" />
                Login
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar - Mobile */}
        {onSearch && (
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                className="pl-10 bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
