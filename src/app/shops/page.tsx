"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { listShopsBySociety } from "@/lib/data";
import type { Shop } from "@/types";

function ShopsList() {
  const { profile } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.societyId) return;
    listShopsBySociety(profile.societyId)
      .then(setShops)
      .finally(() => setLoading(false));
  }, [profile?.societyId]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-3xl mb-1">Shops near you</h1>
      <p className="text-muted mb-8">
        Sellers active inside your society right now.
      </p>

      {loading ? (
        <p className="text-muted">Loading shops…</p>
      ) : shops.length === 0 ? (
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
          {shops.map((shop) => (
            <li key={shop.shopId}>
              <Link
                href={`/shop/${shop.shopId}`}
                className="block border border-line rounded-2xl bg-surface overflow-hidden hover:border-ink/30 transition-colors h-full"
              >
                <div className="h-28 bg-green-bg" />
                <div className="p-4">
                  <p className="font-medium">{shop.shopName}</p>
                  <p className="text-sm text-muted line-clamp-2 mt-1">
                    {shop.description || "Local society shop"}
                  </p>
                  <p className="text-xs text-muted mt-3">
                    Delivery in {shop.deliveryMinValue}–{shop.deliveryMaxValue}{" "}
                    {shop.deliveryUnit}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
