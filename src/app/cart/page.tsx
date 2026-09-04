"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { useCart } from "@/context/CartContext";
import { watchProductsByIds } from "@/lib/data";
import type { Product } from "@/types";

function CartView() {
  const { items, updateQuantity, removeItem, syncStock, total } = useCart();
  const [stock, setStock] = useState<Map<string, number>>(new Map());

  // Live stock: reconcile the cart (drop sold-out, clamp over-stock) like the app.
  useEffect(() => {
    const ids = items.map((i) => i.productId);
    if (ids.length === 0) return;
    const unsub = watchProductsByIds(ids, (products: Product[]) => {
      setStock(new Map(products.map((p) => [p.id, p.quantity])));
      syncStock(products);
    });
    return () => unsub();
    // Re-subscribe only when the SET of product ids changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.productId).sort().join(",")]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl mb-2">Your cart is empty</h1>
        <p className="text-muted mb-6">Add something from a shop in your society.</p>
        <Link
          href="/"
          className="rounded-full bg-accent text-white px-6 py-3 font-medium hover:bg-accent/90 transition-colors"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Your cart</h1>

      <ul className="border border-line rounded-2xl bg-surface divide-y divide-line">
        {items.map((item) => {
          const live = stock.get(item.productId);
          const maxReached = live !== undefined && item.quantity >= live;
          return (
            <li key={item.productId} className="p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-green-bg shrink-0 overflow-hidden">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-sm text-muted">₹{item.price.toFixed(0)} each</p>
                {live !== undefined && live <= 3 && (
                  <p className="text-xs text-danger mt-0.5">
                    {live <= 0 ? "Sold out" : `Only ${live} left`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="w-7 h-7 rounded-full border border-line hover:border-ink/40"
                >
                  −
                </button>
                <span className="w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  disabled={maxReached}
                  className="w-7 h-7 rounded-full border border-line hover:border-ink/40 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => removeItem(item.productId)}
                className="text-sm text-muted hover:text-danger ml-2"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-muted">Total</span>
        <span className="font-display text-2xl">₹{total.toFixed(0)}</span>
      </div>

      <Link
        href="/checkout"
        className="mt-6 block text-center rounded-full bg-accent text-white py-3 font-medium hover:bg-accent/90 transition-colors"
      >
        Proceed to checkout
      </Link>
    </div>
  );
}

export default function CartPage() {
  return (
    <RoleGuard allow={["buyer"]}>
      <CartView />
    </RoleGuard>
  );
}
