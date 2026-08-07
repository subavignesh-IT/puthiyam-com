import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { UIStyleProvider } from "@/hooks/useUIStyle";
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Orders from "./pages/Orders";
import ProductDetail from "./pages/ProductDetail";
import Trending from "./pages/Trending";
import SellerDashboard from "./pages/SellerDashboard";
import SellerLogin from "./pages/SellerLogin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import SellerSignup from "./pages/SellerSignup";
import POS from "./pages/POS";
import RateOrder from "./pages/RateOrder";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
      <UIStyleProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/trending" element={<Trending />} />
              <Route path="/seller" element={<SellerDashboard />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/rate/:orderId" element={<RateOrder />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/seller-login" element={<SellerLogin />} />
              <Route path="/seller-signup" element={<SellerSignup />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </CartProvider>
      </UIStyleProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
