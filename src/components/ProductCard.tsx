"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";

export default function ProductCard({
  product,
  onMultiShop,
  deliveryLabel,
}: {
  product: Product;
  /** Called when the item can't be added because the cart holds another shop. */
  onMultiShop?: () => void;
  /** Optional "2–3 days" style ETA shown on the card (used where the shop is known). */
  deliveryLabel?: string;
}) {
  const { items, addItem, updateQuantity } = useCart();

  const line = items.find((i) => i.productId === product.id);
  const qty = line?.quantity ?? 0;
  const outOfStock = product.quantity <= 0;
  const maxReached = product.quantity > 0 && qty >= product.quantity;

  const add = () => {
    if (addItem(product, product.shopId) === "different-shop") onMultiShop?.();
  };

  return (
    <div className="border border-line rounded-2xl bg-surface overflow-hidden flex flex-col shadow-[0_4px_16px_-6px_rgba(255,122,0,0.18)]">
      <Link href={`/product/${product.id}`} className="block relative">
        <div className="aspect-square bg-green-bg">
          {product.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.coverImage}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted text-sm">
              No image
            </div>
          )}
        </div>
        {deliveryLabel && (
          <span className="absolute top-2 left-2 rounded-full bg-surface/90 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-ink/80">
            🛵 {deliveryLabel}
          </span>
        )}
      </Link>

      <div className="p-3 flex flex-col gap-1 flex-1">
        <Link
          href={`/product/${product.id}`}
          className="font-medium line-clamp-2 hover:underline"
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-medium">₹{product.price.toFixed(0)}</span>

          {qty === 0 ? (
            <button
              onClick={add}
              disabled={outOfStock}
              className="text-sm rounded-full border border-accent text-accent-ink px-4 py-1 hover:bg-accent/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {outOfStock ? "Sold out" : "Add"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(product.id, qty - 1)}
                className="w-7 h-7 rounded-full border border-line hover:border-ink/40"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-5 text-center text-sm">{qty}</span>
              <button
                onClick={() => updateQuantity(product.id, qty + 1)}
                disabled={maxReached}
                className="w-7 h-7 rounded-full border border-line hover:border-ink/40 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
