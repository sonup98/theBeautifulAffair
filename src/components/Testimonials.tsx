import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star, Quote } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Testimonial } from '../types';

gsap.registerPlugin(ScrollTrigger);

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('Testimonials component: setting up listener...');
    setLoading(true);
    
    // Fetch all testimonials
    const q = query(collection(db, 'testimonials'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Testimonials snapshot received, docs count:', snapshot.docs.length);
      try {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            ...docData
          };
        }) as Testimonial[];
        
        // Sort in memory by createdAt desc, fallback to id
        // Handle both number timestamps and Firestore Timestamp objects
        const sortedData = [...data].sort((a, b) => {
          const getTime = (val: any) => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            if (val.toMillis) return val.toMillis();
            if (val.seconds) return val.seconds * 1000;
            return 0;
          };
          
          const timeA = getTime(a.createdAt);
          const timeB = getTime(b.createdAt);
          return timeB - timeA;
        });
        
        console.log('Testimonials data (sorted):', sortedData);
        setTestimonials(sortedData);
        setLoading(false);
      } catch (err: any) {
        console.error('Error processing testimonials data:', err);
        setError('Failed to process testimonials data.');
        setLoading(false);
      }
    }, (err) => {
      console.error('Testimonials fetch error:', err);
      setError('Failed to fetch testimonials. Please check your connection.');
      setLoading(false);
      // We don't throw here to avoid crashing the whole app
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (testimonials.length === 0 || loading) return;

    console.log('Testimonials component: initializing animations for', testimonials.length, 'items');
    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(titleRef.current, 
        { y: 20, opacity: 0 },
        {
          scrollTrigger: {
            trigger: titleRef.current,
            start: "top 95%",
            toggleActions: "play none none reverse"
          },
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out"
        }
      );

      // Cards animation
      const cards = cardsRef.current?.children;
      if (cards && cards.length > 0) {
        console.log('Testimonials component: animating', cards.length, 'cards');
        
        gsap.fromTo(cards, 
          { y: 30, opacity: 0 },
          {
            scrollTrigger: {
              trigger: cardsRef.current,
              start: "top 95%", // More eager start
              toggleActions: "play none none reverse"
            },
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
            onComplete: () => {
              // Ensure opacity is 1 after animation
              gsap.set(cards, { clearProps: "all" });
            }
          }
        );
      }
      
      // Refresh ScrollTrigger to account for dynamic content
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 100);
    }, sectionRef);

    // Fallback: Force visibility after 2 seconds if still hidden
    const fallbackTimer = setTimeout(() => {
      if (cardsRef.current) {
        const cards = cardsRef.current.children;
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i] as HTMLElement;
          if (window.getComputedStyle(card).opacity === '0') {
            console.log('Testimonials component: forcing visibility fallback for card', i);
            gsap.to(card, { opacity: 1, y: 0, duration: 0.5 });
          }
        }
      }
    }, 2000);

    return () => {
      ctx.revert();
      clearTimeout(fallbackTimer);
    };
  }, [testimonials, loading]);

  // Remove the early return to always show the section title if needed, 
  // but the user says they see it, so we'll keep it for now but ensure it's robust.
  
  return (
    <section ref={sectionRef} className="py-24 px-6 md:px-16 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-xs uppercase tracking-[0.3em] text-gold font-medium mb-4">Voices of Elegance</p>
          <h2 ref={titleRef} className="font-serif text-4xl md:text-6xl text-dark">Happy Customers</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin mb-4"></div>
            <p className="text-dark/40 italic">Loading testimonials...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-red-50 rounded-[3rem] border border-red-100">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-xs uppercase tracking-widest font-bold text-dark hover:text-gold transition-colors"
            >
              Try Refreshing
            </button>
          </div>
        ) : testimonials.length > 0 ? (
          <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 items-stretch">
            {testimonials.map((t, idx) => {
              console.log(`Rendering testimonial ${idx}:`, t.name);
              return (
                <div 
                  key={t.id} 
                  className="group relative bg-beige/10 p-8 md:p-10 rounded-[3rem] border border-gold/10 hover:border-gold/30 transition-all duration-500 hover:shadow-2xl hover:shadow-gold/10 flex flex-col h-full min-h-[450px]"
                >
                  <div className="absolute -top-6 left-10 w-12 h-12 bg-gold rounded-2xl flex items-center justify-center text-white shadow-lg shadow-gold/20 transform -rotate-6 group-hover:rotate-0 transition-transform duration-500 z-10">
                    <Quote size={20} fill="currentColor" />
                  </div>

                  <div className="flex-grow flex flex-col">
                    {t.productImageUrl && (
                      <div className="mb-8 aspect-square rounded-[2rem] overflow-hidden relative bg-beige/5 flex-shrink-0">
                        <img 
                          src={t.productImageUrl} 
                          alt={`${t.name} wearing our product`}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            console.error(`Error loading product image for ${t.name}:`, t.productImageUrl);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-dark/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                    )}
                    
                    <div className="flex gap-1 mb-6 flex-shrink-0">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} size={14} className="fill-gold text-gold" />
                      ))}
                    </div>

                    <p className="text-dark/70 leading-relaxed mb-8 italic font-serif text-lg flex-grow">
                      "{t.content}"
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-6 border-t border-gold/5 mt-auto">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gold/20 flex-shrink-0 bg-beige/5">
                      <img 
                        src={t.avatarUrl || `https://picsum.photos/seed/${t.name}/100/100`} 
                        alt={t.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          console.error(`Error loading avatar for ${t.name}:`, t.avatarUrl);
                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${t.name}/100/100`;
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="font-serif text-lg text-dark">{t.name}</h4>
                      <p className="text-[10px] uppercase tracking-widest text-gold font-bold">{t.role}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-beige/5 rounded-[3rem] border border-dashed border-gold/10">
            <p className="text-dark/40 italic">No testimonials shared yet. Be the first to share your experience!</p>
          </div>
        )}
      </div>
    </section>
  );
}
