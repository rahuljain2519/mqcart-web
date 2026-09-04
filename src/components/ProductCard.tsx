"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";

export default function ProductCard({
  product,
  onMultiShop,
}: {
  product: Product;
  /** Called when the item can't be added because the cart holds another shop. */
  onMultiShop?: () => void;
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
    <div className="border border-line rounded-2xl bg-surface overflow-hidden flex flex-col">
      <Link href={`/product/${product.id}`} className="block">
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
