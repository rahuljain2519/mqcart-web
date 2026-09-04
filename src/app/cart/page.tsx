"use client";

import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { useCart } from "@/context/CartContext";

function CartView() {
  const { items, updateQuantity, removeItem, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl mb-2">Your cart is empty</h1>
        <p className="text-muted mb-6">Add something from a shop in your society.</p>
        <Link
          href="/shops"
          className="rounded-full bg-accent text-white px-6 py-3 font-medium hover:bg-accent/90 transition-colors"
        >
          Browse shops
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Your cart</h1>

      <ul className="border border-line rounded-2xl bg-surface divide-y divide-line">
        {items.map((item) => (
          <li key={item.productId} className="p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-green-bg shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted">₹{item.price.toFixed(0)} each</p>
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
                className="w-7 h-7 rounded-full border border-line hover:border-ink/40"
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
        ))}
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
