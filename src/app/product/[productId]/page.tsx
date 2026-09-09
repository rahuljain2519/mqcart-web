"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { useCart } from "@/context/CartContext";
import { watchProduct, watchShopById } from "@/lib/data";
import { hasOptions, priceFor, priceLabel, stockFor, hasDiscount, discountPercent, packSizeLabel } from "@/lib/product";
import type { Product, Shop } from "@/types";

function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const { items, addItem, updateQuantity } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [option, setOption] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    const unsub = watchProduct(productId, (p) => {
      setProduct(p);
      setLoading(false);
    });
    return () => unsub();
  }, [productId]);

  useEffect(() => {
    if (!product?.shopId) return;
    const unsub = watchShopById(product.shopId, setShop);
    return () => unsub();
  }, [product?.shopId]);

  if (loading) {
    return <p className="mx-auto max-w-4xl px-5 py-16 text-muted">Loading…</p>;
  }
  if (!product) {
    return <p className="mx-auto max-w-4xl px-5 py-16 text-muted">Product not found.</p>;
  }

  const variant = hasOptions(product);
  const gallery = product.images.length
    ? product.images
    : [product.coverImage].filter(Boolean);

  // For a variant product the buyer must pick an option before adding.
  const chosen = variant ? option : null;
  const canAct = !variant || chosen !== null;
  const stock = stockFor(product, chosen);
  const outOfStock = canAct && stock <= 0;
  const price = priceFor(product, chosen);

  const line = items.find(
    (i) => i.productId === product.id && (i.optionName ?? null) === chosen
  );
  const qty = line?.quantity ?? 0;
  const maxReached = stock > 0 && qty >= stock;

  const add = () => {
    if (variant && chosen === null) {
      setNotice("Pick an option first.");
      return;
    }
    if (addItem(product, product.shopId, chosen ?? undefined) === "different-shop") {
      setNotice("You can order from only one shop at a time.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-green-bg">
            {gallery[active] ? (
              <Image
                src={gallery[active]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-muted">No image</div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 mt-3">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 ${
                    i === active ? "border-accent" : "border-transparent"
                  }`}
                >
                  <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {shop && (
            <Link
              href={`/shop/${shop.shopId}`}
              className="text-sm text-muted hover:text-ink underline underline-offset-4"
            >
              {shop.shopName}
            </Link>
          )}
          <h1 className="font-display text-3xl mt-1">{product.name}</h1>
          {(product.brand || packSizeLabel(product)) && (
            <p className="text-sm text-muted mt-1">
              {[product.brand, packSizeLabel(product)].filter(Boolean).join(" · ")}
            </p>
          )}
          {hasDiscount(product) ? (
            <p className="flex items-baseline gap-2 mt-3">
              <span className="text-2xl font-medium">₹{price.toFixed(0)}</span>
              <span className="text-base text-muted line-through">₹{product.mrp!.toFixed(0)}</span>
              <span className="text-sm text-green font-medium">{discountPercent(product)}% off</span>
            </p>
          ) : (
            <p className="text-2xl font-medium mt-3">
              {canAct ? `₹${price.toFixed(0)}` : priceLabel(product)}
            </p>
          )}

          {variant && (
            <div className="mt-4">
              <p className="text-sm text-muted mb-2">
                {product.optionLabel || "Options"}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.options!.map((o) => {
                  const sold = o.quantity <= 0;
                  return (
                    <button
                      key={o.name}
                      disabled={sold}
                      onClick={() => setOption(o.name)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        option === o.name
                          ? "border-accent bg-accent/10 text-accent-ink"
                          : "border-line hover:border-ink/30"
                      } ${sold ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                    >
                      {o.name} · ₹{o.price.toFixed(0)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-ink/70 mt-4 whitespace-pre-line">
            {product.description || "No description provided."}
          </p>

          {shop && (
            <p className="text-sm text-muted mt-4">
              Delivery in {shop.deliveryMinValue}–{shop.deliveryMaxValue} {shop.deliveryUnit}
            </p>
          )}

          {notice && <p className="text-sm text-danger mt-4">{notice}</p>}

          <div className="mt-6">
            {outOfStock ? (
              <p className="text-danger font-medium">Sold out</p>
            ) : qty === 0 ? (
              <button
                onClick={add}
                className="rounded-full bg-accent text-white px-8 py-3 font-medium hover:bg-accent/90 transition-colors"
              >
                {variant && chosen === null ? "Select an option" : "Add to cart"}
              </button>
            ) : (
              <div className="inline-flex items-center gap-4 rounded-full border border-line px-4 py-2">
                <button
                  onClick={() => updateQuantity(product.id, qty - 1, chosen ?? undefined)}
                  className="w-8 h-8 rounded-full border border-line hover:border-ink/40"
                >
                  −
                </button>
                <span className="w-6 text-center">{qty}</span>
                <button
                  onClick={() => updateQuantity(product.id, qty + 1, chosen ?? undefined)}
                  disabled={maxReached}
                  className="w-8 h-8 rounded-full border border-line hover:border-ink/40 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductPage() {
  return (
    <RoleGuard allow={["buyer"]}>
      <ProductDetail />
    </RoleGuard>
  );
}
