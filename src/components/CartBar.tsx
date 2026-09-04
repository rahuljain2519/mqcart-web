"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

/** Sticky "N items · ₹X — View cart" bar, shown on browse screens like the app. */
export default function CartBar() {
  const { count, total } = useCart();
  if (count === 0) return null;

  return (
    <div className="sticky bottom-0 z-10 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 py-3 flex items-center justify-between">
        <span className="font-medium text-sm">
          {count} item{count > 1 ? "s" : ""} · ₹{total.toFixed(0)}
        </span>
        <Link
          href="/cart"
          className="rounded-full bg-accent text-white px-5 py-2 text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          View cart
        </Link>
      </div>
    </div>
  );
}
