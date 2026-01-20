export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  rating: number;
  reviewCount: number;
}

export interface CartItem extends Product {
  quantity: number;
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
