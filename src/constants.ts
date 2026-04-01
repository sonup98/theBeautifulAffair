import { Product } from "./types";

export const NEW_ARRIVALS: Product[] = [
  { id: 'na1', name: 'Silk Ribbon Scrunchie', sub: 'Pure silk · Long ribbon', price: 499, category: 'scrunchie', badge: 'New', emoji: '🎀', bgColor: '#f5dce0', accentColor: '#c0394a' },
  { id: 'na2', name: 'Emerald Drop Earrings', sub: 'Gold plated · Emerald stone', price: 699, category: 'earring', badge: 'New', emoji: '✨', bgColor: '#e8f5e8', accentColor: '#4a9e6a' },
  { id: 'na3', name: 'Pearl Choker Necklace', sub: 'Faux pearl · Gold clasp', price: 899, category: 'necklace', badge: 'New', emoji: '📿', bgColor: '#f0f4f8', accentColor: '#8899aa' },
  { id: 'na4', name: 'Crystal Band Ring', sub: 'Silver plated · Clear crystal', price: 599, category: 'ring', badge: 'New', emoji: '💍', bgColor: '#e8e0f0', accentColor: '#1a1a2e' },
];

export const PRODUCTS: Record<string, Product[]> = {
  scrunchie: [
    { id: 's1', name: 'Velvet Rose Scrunchie', sub: 'Soft velvet · Deep rose', price: 299, category: 'scrunchie', badge: 'New', emoji: '🎀', bgColor: '#f5dce0', accentColor: '#c0394a' },
    { id: 's2', name: 'Golden Satin Set', sub: 'Satin · Pack of 3', price: 399, category: 'scrunchie', badge: 'Sale', originalPrice: 499, emoji: '🎀', bgColor: '#fdf3e0', accentColor: '#c9973a' },
    { id: 's3', name: 'Midnight Black Silk', sub: 'Pure silk · Black', price: 449, category: 'scrunchie', emoji: '🎀', bgColor: '#e8e0f0', accentColor: '#1a1a2e' },
    { id: 's4', name: 'Pastel Dream Bundle', sub: 'Cotton · Pack of 5', price: 349, category: 'scrunchie', badge: 'New', emoji: '🎀', bgColor: '#e8f5e8', accentColor: '#4a9e6a' },
  ],
  earring: [
    { id: 'e1', name: 'Jhumka Gold Drop', sub: 'Brass · 22k gold plated', price: 599, category: 'earring', badge: 'New', emoji: '✨', bgColor: '#fdf3e0', accentColor: '#c9973a' },
    { id: 'e2', name: 'Pearl Stud Set', sub: 'Faux pearl · Silver', price: 349, category: 'earring', emoji: '💎', bgColor: '#f0f4f8', accentColor: '#8899aa' },
  ],
  necklace: [
    { id: 'n1', name: 'Layered Chain Set', sub: 'Gold plated · 3 layers', price: 849, category: 'necklace', badge: 'New', emoji: '📿', bgColor: '#fdf3e0', accentColor: '#c9973a' },
  ],
  ring: [
    { id: 'r1', name: 'Stacking Ring Set', sub: 'Gold plated · Set of 5', price: 549, category: 'ring', badge: 'New', emoji: '💍', bgColor: '#fdf3e0', accentColor: '#c9973a' },
  ]
};
