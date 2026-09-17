"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { watchShopById, watchProductsByShop } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import CartBar from "@/components/CartBar";
import ConfirmDialog from "@/components/ConfirmDialog";
import { CATEGORIES, CATEGORY_EMOJI, matchesCategory } from "@/lib/categories";
import type { Shop, Product } from "@/types";

function ShopDetail() {
  const { shopId } = useParams<{ shopId: string }>();
  const { profile } = useAuth();
  const { singleShopId, addItem, clear } = useCart();

  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const loadingShop = shop === undefined;

  useEffect(() => {
    if (!shopId) return;
    const unsubShop = watchShopById(shopId, setShop);
    const unsubProducts = watchProductsByShop(shopId, setProducts);
    return () => {
      unsubShop();
      unsubProducts();
    };
  }, [shopId]);

  const shown = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase().trim();
    return products.filter(
      (p) =>
        (q === "" || p.name.toLowerCase().includes(q)) &&
        matchesCategory(p.category, category)
    );
  }, [products, search, category]);

  if (loadingShop) {
    return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Loading…</p>;
  }
  if (!shop) {
    return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Shop not found.</p>;
  }

  // A seller can't buy from their own shop — same as the app, where the
  // Shops list already hides it entirely.
  if (profile?.uid === shop.sellerId) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-2xl mb-2">This is your shop</h1>
        <p className="text-muted mb-6">You can&rsquo;t buy from your own shop.</p>
        <Link href="/seller" className="rounded-full bg-accent text-white px-6 py-3 font-medium">
          Go to your seller dashboard
        </Link>
      </div>
    );
  }

  const blockedByOtherShop = singleShopId && singleShopId !== shopId;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1">
        {shop.bannerUrl && (
          <div className="relative w-full h-40 md:h-52">
            <Image
              src={shop.bannerUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="mx-auto max-w-6xl px-5 py-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-green-bg shrink-0">
              {shop.logoUrl ? (
                <Image src={shop.logoUrl} alt="" fill sizes="64px" className="object-cover" />
              ) : null}
            </div>
            <div>
              <h1 className="font-display text-3xl">{shop.shopName}</h1>
              {shop.description && (
                <p className="text-muted text-sm mt-1">{shop.description}</p>
              )}
              <p className="text-xs text-muted mt-1">
                Delivery in {shop.deliveryMinValue}–{shop.deliveryMaxValue} {shop.deliveryUnit}
              </p>
            </div>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products in this shop"
            className="w-full border border-line rounded-full px-5 py-2.5 bg-surface mt-6"
          />

          <div className="flex gap-2 overflow-x-auto pt-3 -mx-5 px-5 no-scrollbar">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full pl-2 pr-3 py-1.5 text-sm border transition-colors flex items-center gap-1 ${
                  category === c
                    ? "border-accent bg-accent/10 text-accent-ink"
                    : "border-line hover:border-ink/30"
                }`}
              >
                <span aria-hidden>{CATEGORY_EMOJI[c]}</span>
                {c}
              </button>
            ))}
          </div>

          {blockedByOtherShop && (
            <p className="text-sm text-danger mt-4">
              Your cart has items from another shop.{" "}
              <button onClick={clear} className="underline underline-offset-2">
                Clear it
              </button>{" "}
              to order from here.
            </p>
          )}

          {products === null ? (
            <p className="text-muted mt-8">Loading products…</p>
          ) : shown.length === 0 ? (
            <p className="text-muted mt-8">
              {search || category !== "All"
                ? "No matching products."
                : "This shop hasn't listed any products yet."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6 pb-8">
              {shown.map((p) => (
                <li key={p.id}>
                  <ProductCard
                    product={p}
                    deliveryLabel={`${shop.deliveryMinValue}–${shop.deliveryMaxValue} ${shop.deliveryUnit}`}
                    onMultiShop={setPendingProduct}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingProduct !== null}
        title="Switch shop?"
        message="Your cart has items from a different shop. Clear your cart and add this item instead?"
        confirmLabel="Clear & Add"
        onCancel={() => setPendingProduct(null)}
        onConfirm={() => {
          if (!pendingProduct) return;
          clear();
          addItem(pendingProduct, pendingProduct.shopId);
          setPendingProduct(null);
        }}
      />

      <CartBar />
    </div>
  );
}

export default function ShopPage() {
  return (
    <RoleGuard allow={["buyer", "seller"]}>
      <ShopDetail />
    </RoleGuard>
  );
}
