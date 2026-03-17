import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { Artwork } from '@/data/artworks';

type CartAction =
  | { type: 'ADD'; payload: Artwork }
  | { type: 'REMOVE'; payload: string }
  | { type: 'CLEAR' };

type CartState = Artwork[];

const CART_KEY = 'artsy-pisces-cart';

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD':
      const exists = state.some((item) => item.id === action.payload.id);
      return exists ? state : [...state, action.payload];
    case 'REMOVE':
      return state.filter((item) => item.id !== action.payload);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
};

interface CartContextType {
  cart: CartState;
  addToCart: (artwork: Artwork) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  buyCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const [cart, dispatch] = useReducer(cartReducer, [], () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) as Artwork[] : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = (artwork: Artwork) => dispatch({ type: 'ADD', payload: artwork });
  const removeFromCart = (id: string) => dispatch({ type: 'REMOVE', payload: id });
  const clearCart = () => dispatch({ type: 'CLEAR' });

  const buyCart = () => {
    if (cart.length === 0) return;
    const body = cart.map(item => `- ${item.title} (Art ID: ${item.id})`).join('\n');
    const subject = `Art Purchase - ${cart.length} items`;
    const mailto = `mailto:darshtigoyal4@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    clearCart();
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, buyCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
