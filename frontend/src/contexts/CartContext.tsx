import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { Artwork } from '@/components/GalleryCard';
import { useAuth } from '@/contexts/AuthContext';

type CartAction =
  | { type: 'ADD'; payload: Artwork }
  | { type: 'REMOVE'; payload: string }
  | { type: 'CLEAR' }
  | { type: 'SET'; payload: Artwork[] };

type CartState = Artwork[];

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD':
      return state.some((item) => item.id === action.payload.id)
        ? state
        : [...state, action.payload];
    case 'REMOVE':
      return state.filter((item) => item.id !== action.payload);
    case 'SET':
      return action.payload;
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
  const { user } = useAuth();
  
  // Storage key is user-specific, guest cart fallback
  const cartKey = user ? `artsy-pisces-cart-${user.id}` : 'artsy-pisces-cart-guest';

  const [cart, dispatch] = useReducer(cartReducer, []);

  // Load cart when user changes
  useEffect(() => {
    const saved = localStorage.getItem(cartKey);
    const loadedCart = saved ? (JSON.parse(saved) as Artwork[]) : [];
    dispatch({ type: 'SET', payload: loadedCart });
  }, [cartKey]);

  // Save cart when items or user changes
  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);

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