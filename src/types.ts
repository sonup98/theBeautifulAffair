export interface Product {
  id: string;
  name: string;
  sub?: string;
  price: number;
  originalPrice?: number;
  category: string;
  badge?: string;
  emoji: string;
  imageUrl?: string;
  bgColor: string;
  accentColor: string;
  isNewArrival?: boolean;
  createdAt?: number;
}

export interface Category {
  id: string;
  name: string;
  label: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role?: string;
  content: string;
  rating: number;
  avatarUrl?: string;
  productImageUrl?: string;
  createdAt: number;
}
