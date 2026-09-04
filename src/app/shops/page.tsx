"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { watchShopsBySociety } from "@/lib/data";
import CartBar from "@/components/CartBar";
import AddressBar from "@/components/AddressBar";
import { Skeleton } from "@/components/Skeleton";
import type { Shop } from "@/types";

function ShopsList() {
  const { profile } = useAuth();
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile?.societyId) return;
    const unsub = watchShopsBySociety(profile.societyId, setShops);
    return () => unsub();
  }, [profile?.societyId]);

  const shown = useMemo(() => {
    if (!shops) return [];
    const q = search.toLowerCase().trim();
    return shops.filter(
      (s) => s.sellerId !== profile?.uid && (q === "" || s.shopName.toLowerCase().includes(q))
    );
  }, [shops, search, profile?.uid]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-6xl px-5 py-6 flex-1">
        <div className="mb-4">
          <AddressBar />
        </div>
        <h1 className="font-display text-3xl mb-1">Shops near you</h1>
        <p className="text-muted mb-6">Sellers active inside your society right now.</p>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shops"
          className="w-full border border-line rounded-full px-5 py-2.5 bg-surface mb-6"
        />

        {shops === null ? (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="border border-line rounded-2xl overflow-hidden">
                <Skeleton className="h-28 rounded-none" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </li>
            ))}
          </ul>
        ) : shown.length === 0 ? (
          <div className="border border-line rounded-2xl bg-surface p-10 text-center">
            <p className="font-medium mb-1">No shops here yet</p>
            <p className="text-sm text-muted">
              Nobody has opened a shop in your society yet — check back soon, or{" "}
              <Link href="/sell" className="underline underline-offset-4">
                open one yourself
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shown.map((shop) => (
              <li key={shop.shopId}>
                <Link
                  href={`/shop/${shop.shopId}`}
                  className="block border border-line rounded-2xl bg-surface overflow-hidden hover:border-ink/30 transition-colors h-full shadow-[0_4px_16px_-6px_rgba(255,122,0,0.18)]"
                >
                  <div className="relative h-28 bg-green-bg">
                    {shop.bannerUrl ? (
                      <Image
                        src={shop.bannerUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-4 flex gap-3">
                    <div className="relative w-11 h-11 rounded-full overflow-hidden bg-green-bg shrink-0 -mt-8 border-2 border-surface">
                      {shop.logoUrl ? (
                        <Image src={shop.logoUrl} alt="" fill sizes="44px" className="object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{shop.shopName}</p>
                      <p className="text-sm text-muted line-clamp-2">
                        {shop.description || "Local society shop"}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        Delivery in {shop.deliveryMinValue}–{shop.deliveryMaxValue}{" "}
                        {shop.deliveryUnit}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CartBar />
    </div>
  );
}

export default function ShopsPage() {
  return (
    <RoleGuard allow={["buyer"]}>
      <ShopsList />
    </RoleGuard>
  );
}
