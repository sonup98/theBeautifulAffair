import React, { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Heart, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import gsap from 'gsap';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import CartDrawer from './components/CartDrawer';
import AdminPanel from './components/AdminPanel';
import Testimonials from './components/Testimonials';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { Product, CartItem, Category } from './types';

export default function App() {
  const headerRef = useRef<HTMLElement>(null);
  const brandNameRef = useRef<HTMLHeadingElement>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qProducts = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(fetchedProducts);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const qCategories = query(collection(db, 'categories'));
    const unsubCategories = onSnapshot(qCategories, (snapshot) => {
      const fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(fetchedCategories);
      if (fetchedCategories.length > 0 && !activeTab) {
        setActiveTab(fetchedCategories[0].name);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'hero'), (snapshot) => {
      if (snapshot.exists()) {
        setHeroImageUrl(snapshot.data().heroImageUrl || '');
      }
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSettings();
    };
  }, []);

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.filter(item => item.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlist.length;

  useEffect(() => {
    if (isAdmin) return;
    const ctx = gsap.context(() => {
      // Brand name letters animation
      const chars = brandNameRef.current?.querySelectorAll('span');
      if (chars) {
        gsap.to(chars, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.05,
          ease: 'power4.out',
        });
      }

      // Hero text animation
      gsap.from('.hero-content > *', {
        y: 30,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out',
        delay: 0.5,
      });

      // Navbar fade in
      gsap.from(headerRef.current, {
        y: -20,
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
      });
    });

    return () => ctx.revert();
  }, [isAdmin]);

  if (isAdmin) {
    return <AdminPanel onBack={() => setIsAdmin(false)} />;
  }

  const filteredProducts = products.filter(p => p.category === activeTab);
  const newArrivals = products.filter(p => p.isNewArrival);

  return (
    <div className="min-h-screen flex flex-col">
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
      />

      {/* Navigation */}
      <header 
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gold/10 px-6 md:px-12 h-20 flex items-center justify-between"
      >
        <a href="/" className="font-serif text-xl md:text-2xl tracking-tight">
          The Beautiful Affair
        </a>
        
        <nav className="hidden md:flex items-center gap-8">
          {['Shop', 'New Arrivals', 'Collections', 'About', 'Contact'].map((item) => (
            <a 
              key={item} 
              href={`#${item.toLowerCase().replace(' ', '-')}`}
              className="text-xs uppercase tracking-[0.2em] text-dark/60 hover:text-gold transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a 
            href="#wishlist" 
            className="p-2 hover:text-gold transition-colors relative"
            title="Wishlist"
          >
            <Heart size={20} className={wishlistCount > 0 ? "fill-gold text-gold" : ""} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {wishlistCount}
              </span>
            )}
          </a>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-dark text-white px-5 py-2 rounded-full text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gold transition-all active:scale-95"
          >
            <ShoppingBag size={16} />
            <span>Cart ({cartCount})</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow pt-20">
        <section id="shop" className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 md:px-16 overflow-hidden text-center">
          
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            {heroImageUrl ? (
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
                style={{ 
                  backgroundImage: `url('${heroImageUrl}')`,
                  filter: 'brightness(0.6)'
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-beige via-white to-beige-dark" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-dark/40 via-transparent to-white/10" />
          </div>

          {/* Content */}
          <div className="z-10 py-12 md:py-0 hero-content max-w-4xl">
            <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-gold font-medium mb-6">
              Handcrafted Elegance — 2025
            </p>
            <h1 
              ref={brandNameRef}
              className={cn(
                "font-serif text-5xl md:text-9xl leading-[0.9] mb-8 overflow-hidden",
                heroImageUrl ? "text-white" : "text-dark"
              )}
            >
              <div className="overflow-hidden py-1">
                <span className="inline-block translate-y-full opacity-0">Affordable</span>
              </div>
              <div className="overflow-hidden py-1">
                <span className="inline-block translate-y-full opacity-0">Elegance</span>
              </div>
              <div className="font-italic text-gold text-3xl md:text-6xl mt-6 italic overflow-hidden">
                <span className="inline-block translate-y-full opacity-0">— for every woman.</span>
              </div>
            </h1>
            <p className={cn(
              "max-w-2xl mx-auto leading-relaxed mb-12 text-base md:text-xl",
              heroImageUrl ? "text-white/80" : "text-dark/60"
            )}>
              Discover our curated collection of handcrafted scrunchies, earrings, and necklaces designed to elevate your everyday style.
            </p>
            <div className="flex flex-wrap justify-center gap-8">
              <a href="#collections" className="group flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-gold font-semibold">
                Explore Collection
                <span className="w-10 h-[1px] bg-gold group-hover:w-16 transition-all duration-300"></span>
              </a>
            </div>
          </div>

          {/* Scroll Hint */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-40">
            <div className="w-[1px] h-12 bg-gradient-to-b from-dark to-transparent animate-pulse"></div>
            <span className="text-[8px] uppercase tracking-[0.4em]">Scroll</span>
          </div>
        </section>

        {/* New Arrivals Section */}
        {newArrivals.length > 0 && (
          <section id="new-arrivals" className="py-24 px-6 md:px-16 bg-gold/5 overflow-hidden">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gold mb-3">Freshly Crafted</p>
                  <h2 className="font-serif text-4xl md:text-6xl">New Arrivals</h2>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      const el = document.getElementById('arrival-carousel');
                      if (el) el.scrollBy({ left: -300, behavior: 'smooth' });
                    }}
                    className="w-12 h-12 rounded-full border border-gold/20 flex items-center justify-center hover:bg-gold hover:text-white transition-all active:scale-90"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => {
                      const el = document.getElementById('arrival-carousel');
                      if (el) el.scrollBy({ left: 300, behavior: 'smooth' });
                    }}
                    className="w-12 h-12 rounded-full border border-gold/20 flex items-center justify-center hover:bg-gold hover:text-white transition-all active:scale-90"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div 
                id="arrival-carousel"
                className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide snap-x snap-mandatory items-stretch"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {newArrivals.map((product, i) => (
                  <motion.div 
                    key={product.id}
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="w-[160px] sm:w-[280px] md:w-[320px] flex-shrink-0 snap-start group cursor-pointer flex flex-col"
                  >
                    <div className="relative bg-white p-2 sm:p-3 pb-8 sm:pb-12 shadow-2xl border border-black/5 transition-all duration-500 group-hover:-translate-y-4 group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] h-full flex flex-col min-h-[280px] sm:min-h-[380px] w-full rounded-sm">
                      <div 
                        className="aspect-square overflow-hidden relative mb-2 sm:mb-4 bg-beige/20 rounded-sm flex-shrink-0"
                      >
                        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] z-10 pointer-events-none"></div>
                        {product.isNewArrival && (
                          <span className="absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 sm:px-2 py-0.5 rounded-sm text-[6px] sm:text-[7px] uppercase tracking-widest text-white bg-gold z-20 shadow-sm font-bold">
                            New
                          </span>
                        )}
                        <div className="w-full h-full flex items-center justify-center text-4xl sm:text-7xl group-hover:scale-105 transition-transform duration-700 ease-out">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover grayscale-[0.1] contrast-[1.1]"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            product.emoji
                          )}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(product);
                          }}
                          className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1 sm:p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all z-20 group/heart"
                          title={wishlist.find(item => item.id === product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                        >
                          <Heart 
                            size={12} 
                            className={cn(
                              "transition-all duration-300",
                              wishlist.find(item => item.id === product.id) 
                                ? "fill-red-500 text-red-500 scale-110" 
                                : "text-dark/40 group-hover/heart:text-red-500"
                            )} 
                          />
                        </button>
                      </div>
                      <div className="px-1 mt-auto text-center">
                        <h3 className="font-handwriting text-lg sm:text-2xl text-dark/80 leading-none mb-1 sm:mb-2">{product.name}</h3>
                        <p className="text-[7px] sm:text-[9px] uppercase tracking-widest text-dark/30 font-bold mb-2 sm:mb-3">{product.sub}</p>
                        <div className="flex items-center justify-center gap-2 sm:gap-4">
                          <p className="font-handwriting text-base sm:text-xl text-gold">₹{product.price}</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            className="bg-dark text-white p-1.5 sm:p-2 rounded-full shadow-lg hover:bg-gold transition-all active:scale-90"
                            title="Add to Cart"
                          >
                            <ShoppingBag size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Collections Section */}
        <section id="collections" className="py-24 px-6 md:px-16 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-xs uppercase tracking-widest text-gold mb-3">Curated For You</p>
              <h2 className="font-serif text-4xl md:text-6xl mb-8">Our Collections</h2>
              
              {/* Tabs */}
              <div className="flex flex-wrap justify-center gap-4 md:gap-8 border-b border-beige">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.name)}
                    className={cn(
                      "pb-4 text-xs uppercase tracking-[0.2em] transition-all border-b-2",
                      activeTab === cat.name ? "text-gold border-gold" : "text-dark/40 border-transparent hover:text-dark"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin"></div>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-12 items-stretch">
                {filteredProducts.map((product, i) => (
                  <div 
                    key={product.id} 
                    className="group cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500 h-full"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className={cn(
                      "relative bg-white p-2 sm:p-3 pb-8 sm:pb-12 shadow-xl border border-black/5 transition-all duration-500 group-hover:-translate-y-4 group-hover:shadow-2xl group-hover:rotate-0 h-full flex flex-col min-h-[280px] sm:min-h-[380px] rounded-sm",
                      i % 3 === 0 ? "-rotate-1" : i % 3 === 1 ? "rotate-1" : "rotate-0"
                    )}>
                      <div 
                        className="aspect-square overflow-hidden relative mb-2 sm:mb-4 bg-beige/10 rounded-sm"
                      >
                        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] z-10 pointer-events-none"></div>
                        {product.badge && (
                          <span className={cn(
                            "absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 sm:px-2 py-0.5 rounded-sm text-[6px] sm:text-[7px] uppercase tracking-widest text-white z-20 shadow-sm",
                            product.badge === 'Sale' ? "bg-red-500" : "bg-dark"
                          )}>
                            {product.badge}
                          </span>
                        )}
                        <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl group-hover:scale-105 transition-transform duration-700 ease-out">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover grayscale-[0.05] contrast-[1.05]"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            product.emoji
                          )}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(product);
                          }}
                          className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1 sm:p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all z-20 group/heart"
                          title={wishlist.find(item => item.id === product.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                        >
                          <Heart 
                            size={12} 
                            className={cn(
                              "transition-all duration-300",
                              wishlist.find(item => item.id === product.id) 
                                ? "fill-red-500 text-red-500 scale-110" 
                                : "text-dark/40 group-hover/heart:text-red-500"
                            )} 
                          />
                        </button>
                      </div>
                      <div className="px-1 mt-auto text-center">
                        <h3 className="font-handwriting text-lg sm:text-2xl text-dark/80 leading-none mb-1 sm:mb-2">{product.name}</h3>
                        <p className="text-[7px] sm:text-[9px] uppercase tracking-widest text-dark/30 font-bold mb-2 sm:mb-3">{product.sub}</p>
                        <div className="flex items-center justify-center gap-2 sm:gap-4">
                          <p className="font-handwriting text-base sm:text-xl text-gold">₹{product.price}</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            className="bg-dark text-white p-1.5 sm:p-2 rounded-full shadow-lg hover:bg-gold transition-all active:scale-90"
                            title="Add to Cart"
                          >
                            <ShoppingBag size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-beige/10 rounded-[3rem]">
                <p className="text-dark/40 italic">No products found in this category.</p>
              </div>
            )}
          </div>
        </section>

        {/* Wishlist Section */}
        {wishlist.length > 0 && (
          <section id="wishlist" className="py-24 px-6 md:px-16 bg-beige/5">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium mb-4">Your Favorites</p>
                <h2 className="font-serif text-4xl md:text-6xl text-dark">Wishlist</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-12 items-stretch">
                {wishlist.map((product, i) => (
                  <div 
                    key={`wishlist-${product.id}`} 
                    className="group cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500 h-full"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="relative bg-white p-2 sm:p-3 pb-8 sm:pb-12 shadow-2xl border border-black/5 transition-all duration-500 group-hover:-translate-y-4 group-hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] h-full flex flex-col min-h-[280px] sm:min-h-[380px] w-full rounded-sm">
                      <div 
                        className="aspect-square overflow-hidden relative mb-2 sm:mb-4 bg-beige/20 rounded-sm flex-shrink-0"
                      >
                        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] z-10 pointer-events-none"></div>
                        <div className="w-full h-full flex items-center justify-center text-4xl sm:text-7xl group-hover:scale-105 transition-transform duration-700 ease-out">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover grayscale-[0.1] contrast-[1.1]"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            product.emoji
                          )}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(product);
                          }}
                          className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1 sm:p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all z-20 group/heart"
                        >
                          <Heart 
                            size={12} 
                            className="fill-red-500 text-red-500 scale-110" 
                          />
                        </button>
                      </div>
                      <div className="px-1 mt-auto text-center">
                        <h3 className="font-handwriting text-lg sm:text-2xl text-dark/80 leading-none mb-1 sm:mb-2">{product.name}</h3>
                        <p className="text-[7px] sm:text-[9px] uppercase tracking-widest text-dark/30 font-bold mb-2 sm:mb-3">{product.sub}</p>
                        <div className="flex items-center justify-center gap-2 sm:gap-4">
                          <p className="font-handwriting text-base sm:text-xl text-gold">₹{product.price}</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            className="bg-dark text-white p-1.5 sm:p-2 rounded-full shadow-lg hover:bg-gold transition-all active:scale-90"
                            title="Add to Cart"
                          >
                            <ShoppingBag size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Testimonials Section */}
        <Testimonials />

        {/* Brand Story */}
        <section className="py-24 px-6 md:px-16 bg-beige/30">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-3xl md:text-5xl mb-8 leading-tight">
              Crafting beauty into the <span className="italic text-gold">everyday moments</span> of life.
            </h2>
            <p className="text-dark/60 leading-relaxed mb-12">
              The Beautiful Affair was born from a simple idea: that elegance shouldn't be reserved for special occasions. Every piece in our collection is handcrafted with meticulous attention to detail, using premium materials that feel as good as they look.
            </p>
            <button className="bg-dark text-white px-10 py-4 rounded-full text-xs uppercase tracking-[0.3em] hover:bg-gold transition-all">
              Our Story
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white py-20 px-6 md:px-16 border-t border-beige">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <h2 className="font-serif text-3xl mb-6">The Beautiful Affair</h2>
            <p className="text-dark/50 max-w-sm text-sm leading-relaxed">
              Premium handcrafted accessories for the modern woman. Join our journey of elegance and style.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold mb-6">Shop</h4>
            <ul className="space-y-4 text-sm text-dark/60">
              <li><a href="#" className="hover:text-gold transition-colors">Scrunchies</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Earrings</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Necklaces</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Rings</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold mb-6">Follow Us</h4>
            <ul className="space-y-4 text-sm text-dark/60">
              <li><a href="#" className="hover:text-gold transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Facebook</a></li>
              <li><a href="#" className="hover:text-gold transition-colors">Pinterest</a></li>
              <li>
                <button 
                  onClick={() => setIsAdmin(true)}
                  className="flex items-center gap-2 hover:text-gold transition-colors"
                >
                  <Settings size={14} />
                  Admin Panel
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-beige flex flex-col md:row justify-between items-center gap-4">
          <p className="text-[10px] uppercase tracking-widest text-dark/40">
            © 2025 The Beautiful Affair. All rights reserved.
          </p>
          <div className="flex gap-8 text-[10px] uppercase tracking-widest text-dark/40">
            <a href="#" className="hover:text-dark transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-dark transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
