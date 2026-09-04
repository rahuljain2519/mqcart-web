"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import ShopForm from "@/components/ShopForm";
import { useAuth } from "@/context/AuthContext";
import {
  getShopBySeller,
  watchShopById,
  watchOrdersBySeller,
} from "@/lib/data";
import { registerSellerPush } from "@/lib/push";
import type { Shop, Order } from "@/types";

function SellerDashboard() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null | undefined>(undefined); // undefined = loading
  const [orders, setOrders] = useState<Order[]>([]);

  // Resolve the shop: prefer the linked id, fall back to a lookup by seller.
  useEffect(() => {
    if (!profile?.uid) return;
    let unsub = () => {};
    (async () => {
      let shopId = profile.shopId ?? null;
      if (!shopId) {
        const s = await getShopBySeller(profile.uid);
        shopId = s?.shopId ?? null;
      }
      if (!shopId) {
        setShop(null);
        return;
      }
      unsub = watchShopById(shopId, setShop);
    })();
    return () => unsub();
  }, [profile?.uid, profile?.shopId]);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = watchOrdersBySeller(profile.uid, setOrders);
    return () => unsub();
  }, [profile?.uid]);

  // Ask for new-order push once we know this is a seller with a shop.
  useEffect(() => {
    if (profile?.uid && shop && shop.shopId) registerSellerPush(profile.uid);
  }, [profile?.uid, shop]);

  if (shop === undefined) {
    return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Loading…</p>;
  }

  if (shop === null) {
    if (!profile) return null;
    return (
      <div className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-3xl mb-2">Create your shop</h1>
        <p className="text-muted mb-8">
          Set up your storefront. It stays inactive until you pick a plan.
        </p>
        <ShopForm
          mode="create"
          sellerId={profile.uid}
          societyId={profile.societyId}
          uid={profile.uid}
          onDone={async () => {
            await refreshProfile();
            router.replace("/seller/activate");
          }}
        />
      </div>
    );
  }

  const pending = orders.filter((o) => o.status === "placed").length;
  const revenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl">{shop.shopName}</h1>
        <Link
          href="/seller/settings"
          className="text-sm rounded-full border border-line px-4 py-2 hover:border-ink/40"
        >
          Shop settings
        </Link>
      </div>
      <p className="text-muted mb-6">
        {shop.isActive ? "Live in your society" : "Not active"} · Plan: {shop.plan}
      </p>

      {!shop.isActive && (
        <div className="border border-danger/30 bg-danger/5 rounded-2xl p-5 mb-8">
          <p className="font-medium text-danger">Your shop is inactive</p>
          <p className="text-sm text-ink/70 mt-1">
            Pick a plan to start receiving orders.
          </p>
          <Link
            href="/seller/activate"
            className="inline-block mt-3 rounded-full bg-accent text-white px-5 py-2 text-sm font-medium"
          >
            Activate shop
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-5 mb-10">
        <Stat label="Products listed" value={`${shop.productCount}/${shop.productLimit}`} />
        <Stat label="Orders awaiting action" value={String(pending)} />
        <Stat label="Delivered revenue" value={`₹${revenue.toFixed(0)}`} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/seller/products"
          className="rounded-full bg-accent text-white px-5 py-2.5 font-medium hover:bg-accent/90 transition-colors"
        >
          Manage products
        </Link>
        <Link
          href="/seller/orders"
          className="rounded-full border border-line px-5 py-2.5 font-medium hover:border-ink/40"
        >
          Orders
        </Link>
        <Link
          href="/seller/preview"
          className="rounded-full border border-line px-5 py-2.5 font-medium hover:border-ink/40"
        >
          Preview shop
        </Link>
        {shop.isActive && (
          <Link
            href="/seller/activate"
            className="rounded-full border border-line px-5 py-2.5 font-medium hover:border-ink/40"
          >
            Upgrade plan
          </Link>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line rounded-2xl bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-2xl mt-1">{value}</p>
    </div>
  );
}

export default function SellerPage() {
  return (
    <RoleGuard allow={["seller"]}>
      <SellerDashboard />
    </RoleGuard>
  );
}
