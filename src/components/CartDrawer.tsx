import React from 'react';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { CartItem } from '../types';
import { cn } from '../lib/utils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

export default function CartDrawer({ 
  isOpen, 
  onClose, 
  items, 
  onUpdateQuantity, 
  onRemove 
}: CartDrawerProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      {/* Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={cn(
        "fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[110] shadow-2xl transition-transform duration-500 ease-out flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-beige">
          <h2 className="font-serif text-2xl">Your Cart</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-beige rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-dark/40 gap-4">
              <ShoppingBag size={48} strokeWidth={1} />
              <p className="font-serif text-lg">Your cart is empty</p>
              <button 
                onClick={onClose}
                className="text-xs uppercase tracking-widest text-gold border-b border-gold"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 animate-in slide-in-from-right-4 duration-300">
                  <div 
                    className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl shrink-0"
                    style={{ backgroundColor: item.bgColor }}
                  >
                    {item.emoji}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-serif text-base mb-1">{item.name}</h3>
                    <p className="text-[10px] text-dark/40 uppercase tracking-widest mb-3">{item.category}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-beige rounded-lg overflow-hidden">
                        <button 
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="p-1 hover:bg-beige transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-xs">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="p-1 hover:bg-beige transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="font-medium">₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onRemove(item.id)}
                    className="text-dark/20 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-top border-beige bg-beige/10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs uppercase tracking-widest text-dark/60">Subtotal</span>
              <span className="text-xl font-medium">₹{total.toLocaleString()}</span>
            </div>
            <button className="w-full bg-dark text-white py-4 rounded-full text-xs uppercase tracking-[0.2em] hover:bg-gold transition-all active:scale-95 shadow-lg shadow-dark/10">
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
