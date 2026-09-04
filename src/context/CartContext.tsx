"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { CartItem, Product } from "@/types";

export type AddToCartResult = "ok" | "different-shop";

interface CartContextValue {
  items: CartItem[];
  /** Returns "different-shop" if the cart already holds items from another shop. */
  addItem: (product: Product, shopId: string) => AddToCartResult;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  /** Reconcile cart lines against live stock — drop sold-out, clamp over-stock. */
  syncStock: (products: Product[]) => void;
  total: number;
  count: number;
  singleShopId: string | null;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "mqcart_web_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // Hydrate from localStorage on mount — can't run during SSR, so an effect
      // is the correct place despite the set-state-in-effect lint.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt cart data
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full / disabled — cart still works in-memory
    }
  }, [items, hydrated]);

  const addItem = useCallback(
    (product: Product, shopId: string): AddToCartResult => {
      let result: AddToCartResult = "ok";
      setItems((prev) => {
        const currentShop = prev.length ? prev[0].shopId : null;
        if (currentShop && currentShop !== shopId) {
          result = "different-shop";
          return prev;
        }
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.coverImage,
            sellerId: product.sellerId,
            shopId,
            quantity: 1,
          },
        ];
      });
      return result;
    },
    []
  );

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }, []);

  const removeItem = useCallback(
    (productId: string) =>
      setItems((prev) => prev.filter((i) => i.productId !== productId)),
    []
  );

  const clear = useCallback(() => setItems([]), []);

  const syncStock = useCallback((products: Product[]) => {
    const stock = new Map(products.map((p) => [p.id, p.quantity]));
    setItems((prev) =>
      prev
        .map((i) => {
          const live = stock.get(i.productId);
          if (live === undefined) return i; // product not in this batch — leave it
          if (live <= 0) return null;
          return live < i.quantity ? { ...i, quantity: live } : i;
        })
        .filter((i): i is CartItem => i !== null)
    );
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const singleShopId = items.length ? items[0].shopId : null;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clear,
        syncStock,
        total,
        count,
        singleShopId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
