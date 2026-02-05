export interface ProductVariant {
  weight: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  rating: number;
  reviewCount: number;
  variants?: ProductVariant[];
  isInStock?: boolean;
  isOnSale?: boolean;
  discountAmount?: number;
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: ProductVariant;
  cartItemId?: string;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  image?: string;
  date: string;
}

export interface CustomerOrder {
  name: string;
  phone: string;
  address?: string;
  deliveryType: 'shipping' | 'self-pickup';
  items: CartItem[];
  total: number;
  shippingCost: number;
}

export interface DbProduct {
  id: string;
  seller_id: string;
  name: string;
  description: string | null;
  category: string;
  base_price: number;
  measurement_unit: string;
  packing_type: string | null;
  is_active: boolean;
  is_in_stock: boolean;
  is_on_sale: boolean;
  discount_amount: number;
  created_at: string;
  updated_at: string;
}

export interface DbProductVariant {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  is_default: boolean | null;
  stock_quantity: number;
  created_at: string;
}

export interface DbProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean | null;
  display_order: number | null;
  created_at: string;
}
