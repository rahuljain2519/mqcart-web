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
import { lineKey } from "@/types";
import { hasOptions, priceFor, stockFor } from "@/lib/product";

export type AddToCartResult = "ok" | "different-shop";

interface CartContextValue {
  items: CartItem[];
  /** Returns "different-shop" if the cart already holds items from another shop. */
  addItem: (
    product: Product,
    shopId: string,
    optionName?: string
  ) => AddToCartResult;
  updateQuantity: (
    productId: string,
    quantity: number,
    optionName?: string
  ) => void;
  removeItem: (productId: string, optionName?: string) => void;
  clear: () => void;
  /** Reconcile cart lines against live stock — drop sold-out, clamp over-stock. */
  syncStock: (products: Product[]) => void;
  total: number;
  count: number;
  singleShopId: string | null;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = "mqcart_web_cart";

const keyOf = (i: CartItem) => lineKey(i.productId, i.optionName);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
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
    (product: Product, shopId: string, optionName?: string): AddToCartResult => {
      let result: AddToCartResult = "ok";
      setItems((prev) => {
        const currentShop = prev.length ? prev[0].shopId : null;
        if (currentShop && currentShop !== shopId) {
          result = "different-shop";
          return prev;
        }
        const k = lineKey(product.id, optionName);
        const existing = prev.find((i) => keyOf(i) === k);
        if (existing) {
          return prev.map((i) =>
            keyOf(i) === k ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            price: priceFor(product, optionName),
            imageUrl: product.coverImage,
            sellerId: product.sellerId,
            shopId,
            quantity: 1,
            ...(optionName ? { optionName } : {}),
          },
        ];
      });
      return result;
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number, optionName?: string) => {
      const k = lineKey(productId, optionName);
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => keyOf(i) !== k)
          : prev.map((i) => (keyOf(i) === k ? { ...i, quantity } : i))
      );
    },
    []
  );

  const removeItem = useCallback((productId: string, optionName?: string) => {
    const k = lineKey(productId, optionName);
    setItems((prev) => prev.filter((i) => keyOf(i) !== k));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const syncStock = useCallback((products: Product[]) => {
    const byId = new Map(products.map((p) => [p.id, p]));
    setItems((prev) =>
      prev
        .map((i) => {
          const p = byId.get(i.productId);
          if (!p) return i; // not in this batch — leave it
          const live = stockFor(p, i.optionName);
          if (live <= 0) return null;
          // Keep the option price fresh too.
          const price = hasOptions(p) ? priceFor(p, i.optionName) : p.price;
          const qty = live < i.quantity ? live : i.quantity;
          return { ...i, price, quantity: qty };
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
