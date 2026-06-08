import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { Artwork } from '@/components/GalleryCard';

type CartAction =
  | { type: 'ADD'; payload: Artwork }
  | { type: 'REMOVE'; payload: string }
  | { type: 'CLEAR' };

type CartState = Artwork[];

const CART_KEY = 'artsy-pisces-cart';

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD':
      return state.some((item) => item.id === action.payload.id)
        ? state
        : [...state, action.payload];
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
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

  const addToCart    = (artwork: Artwork) => dispatch({ type: 'ADD', payload: artwork });
  const removeFromCart = (id: string)    => dispatch({ type: 'REMOVE', payload: id });
  const clearCart    = ()                => dispatch({ type: 'CLEAR' });

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};