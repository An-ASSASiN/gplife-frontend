import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // matches product id
  sku: string;
  title: string;
  localPrice: number;
  quantity: number;
  imageUrl?: string;
  category: string;
}

export interface LocationState {
  latitude: number;
  longitude: number;
  address: string;
}

interface CartStore {
  cart: CartItem[];
  location: LocationState | null;
  referredByCode: string;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setLocation: (location: LocationState | null) => void;
  setReferredByCode: (code: string) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cart: [],
      location: null,
      referredByCode: '',
      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((i) => i.id === item.id);
          if (existing) {
            return {
              cart: state.cart.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { cart: [...state.cart, { ...item, quantity: 1 }] };
        }),
      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((i) => i.id !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          cart: state.cart
            .map((i) => (i.id === productId ? { ...i, quantity } : i))
            .filter((i) => i.quantity > 0),
        })),
      clearCart: () => set({ cart: [] }),
      setLocation: (location) => set({ location }),
      setReferredByCode: (code) => set({ referredByCode: code }),
    }),
    {
      name: 'gplife-cart-storage',
    }
  )
);
