"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { getShopBySeller, watchShopById, watchProductsByShop } from "@/lib/data";
import type { Shop, Product } from "@/types";

function Preview() {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile?.uid) return;
    let unsubShop = () => {};
    let unsubProducts = () => {};
    getShopBySeller(profile.uid).then((s) => {
      if (!s) {
        setShop(null);
        return;
      }
      unsubShop = watchShopById(s.shopId, setShop);
      unsubProducts = watchProductsByShop(s.shopId, setProducts);
    });
    return () => {
      unsubShop();
      unsubProducts();
    };
  }, [profile?.uid]);

  const shown = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => q === "" || p.name.toLowerCase().includes(q));
  }, [products, search]);

  if (shop === undefined) {
    return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Loading…</p>;
  }
  if (!shop) {
    return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Create your shop first.</p>;
  }

  return (
    <div>
      <div className="bg-accent/10 text-accent-ink text-sm text-center py-2">
        Preview — this is how buyers see your shop
      </div>

      {shop.bannerUrl && (
        <div className="relative w-full h-40 md:h-52">
          <Image src={shop.bannerUrl} alt="" fill sizes="100vw" className="object-cover" />
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

        {shown.length === 0 ? (
          <p className="text-muted mt-8">No active products to show.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6 pb-8">
            {shown.map((p) => (
              <li
                key={p.id}
                className="border border-line rounded-2xl bg-surface overflow-hidden"
              >
                <div className="relative aspect-square bg-green-bg">
                  {p.coverImage ? (
                    <Image
                      src={p.coverImage}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted text-sm">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium line-clamp-2">{p.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-medium">₹{p.price.toFixed(0)}</span>
                    <span className="text-sm rounded-full border border-line text-muted px-4 py-1">
                      Add
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function SellerPreviewPage() {
  return (
    <RoleGuard allow={["seller"]}>
      <Preview />
    </RoleGuard>
  );
}
