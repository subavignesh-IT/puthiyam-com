import { Product } from '@/types/product';

export const categories = [
  'All',
  'Groceries',
  'Spices',
  'Snacks',
  'Beverages',
  'Personal Care',
  'Home Essentials'
];

export const products: Product[] = [
  {
    id: '1',
    name: 'Organic Turmeric Powder',
    price: 120,
    category: 'Spices',
    image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400',
    description: 'Pure organic turmeric powder, perfect for cooking and health benefits',
    rating: 4.5,
    reviewCount: 24
  },
  {
    id: '2',
    name: 'Premium Basmati Rice',
    price: 280,
    category: 'Groceries',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
    description: 'Long grain premium basmati rice, aged for perfect aroma',
    rating: 4.8,
    reviewCount: 56
  },
  {
    id: '3',
    name: 'Homemade Murukku',
    price: 150,
    category: 'Snacks',
    image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400',
    description: 'Crispy traditional murukku made with love',
    rating: 4.7,
    reviewCount: 32
  },
  {
    id: '4',
    name: 'Filter Coffee Powder',
    price: 200,
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
    description: 'Authentic South Indian filter coffee blend',
    rating: 4.9,
    reviewCount: 89
  },
  {
    id: '5',
    name: 'Natural Coconut Oil',
    price: 350,
    category: 'Personal Care',
    image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400',
    description: 'Cold-pressed virgin coconut oil for hair and skin',
    rating: 4.6,
    reviewCount: 45
  },
  {
    id: '6',
    name: 'Handmade Agarbatti',
    price: 80,
    category: 'Home Essentials',
    image: 'https://images.unsplash.com/photo-1602513292466-dc082bb58eda?w=400',
    description: 'Natural fragrance incense sticks, pack of 100',
    rating: 4.4,
    reviewCount: 18
  },
  {
    id: '7',
    name: 'Red Chilli Powder',
    price: 95,
    category: 'Spices',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
    description: 'Premium red chilli powder with perfect heat',
    rating: 4.3,
    reviewCount: 27
  },
  {
    id: '8',
    name: 'Organic Jaggery',
    price: 110,
    category: 'Groceries',
    image: 'https://images.unsplash.com/photo-1623428454614-abaf00244f52?w=400',
    description: 'Pure organic jaggery, natural sweetener',
    rating: 4.7,
    reviewCount: 41
  }
];
