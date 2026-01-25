import { Product, ProductVariant } from '@/types/product';

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
    price: 60,
    category: 'Spices',
    image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400',
    description: 'Pure organic turmeric powder, perfect for cooking and health benefits. Our turmeric is sourced from the finest farms and processed naturally to retain maximum curcumin content.',
    rating: 4.5,
    reviewCount: 24,
    variants: [
      { weight: '50g', price: 60 },
      { weight: '100g', price: 120 },
      { weight: '200g', price: 220 },
    ]
  },
  {
    id: '2',
    name: 'Premium Basmati Rice',
    price: 140,
    category: 'Groceries',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
    description: 'Long grain premium basmati rice, aged for perfect aroma. Each grain is carefully selected to ensure the finest quality for your meals.',
    rating: 4.8,
    reviewCount: 56,
    variants: [
      { weight: '500g', price: 140 },
      { weight: '1kg', price: 280 },
      { weight: '2kg', price: 520 },
    ]
  },
  {
    id: '3',
    name: 'Homemade Murukku',
    price: 75,
    category: 'Snacks',
    image: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400',
    description: 'Crispy traditional murukku made with love. Handcrafted using traditional recipes passed down through generations.',
    rating: 4.7,
    reviewCount: 32,
    variants: [
      { weight: '100g', price: 75 },
      { weight: '250g', price: 150 },
      { weight: '500g', price: 280 },
    ]
  },
  {
    id: '4',
    name: 'Filter Coffee Powder',
    price: 100,
    category: 'Beverages',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
    description: 'Authentic South Indian filter coffee blend. Made from premium Arabica beans roasted to perfection for that rich, aromatic flavor.',
    rating: 4.9,
    reviewCount: 89,
    variants: [
      { weight: '100g', price: 100 },
      { weight: '250g', price: 200 },
      { weight: '500g', price: 380 },
    ]
  },
  {
    id: '5',
    name: 'Natural Coconut Oil',
    price: 175,
    category: 'Personal Care',
    image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400',
    description: 'Cold-pressed virgin coconut oil for hair and skin. 100% pure and natural, extracted using traditional wooden press method.',
    rating: 4.6,
    reviewCount: 45,
    variants: [
      { weight: '100ml', price: 175 },
      { weight: '250ml', price: 350 },
      { weight: '500ml', price: 650 },
    ]
  },
  {
    id: '6',
    name: 'Handmade Agarbatti',
    price: 40,
    category: 'Home Essentials',
    image: 'https://images.unsplash.com/photo-1602513292466-dc082bb58eda?w=400',
    description: 'Natural fragrance incense sticks. Hand-rolled using traditional methods with natural ingredients for a soothing ambiance.',
    rating: 4.4,
    reviewCount: 18,
    variants: [
      { weight: '50 sticks', price: 40 },
      { weight: '100 sticks', price: 80 },
      { weight: '200 sticks', price: 150 },
    ]
  },
  {
    id: '7',
    name: 'Red Chilli Powder',
    price: 50,
    category: 'Spices',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400',
    description: 'Premium red chilli powder with perfect heat. Ground from handpicked red chillies for consistent color and spice level.',
    rating: 4.3,
    reviewCount: 27,
    variants: [
      { weight: '50g', price: 50 },
      { weight: '100g', price: 95 },
      { weight: '200g', price: 180 },
    ]
  },
  {
    id: '8',
    name: 'Organic Jaggery',
    price: 55,
    category: 'Groceries',
    image: 'https://images.unsplash.com/photo-1623428454614-abaf00244f52?w=400',
    description: 'Pure organic jaggery, natural sweetener. Made from fresh sugarcane juice without any chemicals or artificial colors.',
    rating: 4.7,
    reviewCount: 41,
    variants: [
      { weight: '250g', price: 55 },
      { weight: '500g', price: 110 },
      { weight: '1kg', price: 200 },
    ]
  }
];
