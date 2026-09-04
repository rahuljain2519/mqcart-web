"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { getShopBySeller, listOrdersBySeller } from "@/lib/data";
import type { Shop, Order } from "@/types";

function SellerDashboard() {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    Promise.all([getShopBySeller(profile.uid), listOrdersBySeller(profile.uid)])
      .then(([s, o]) => {
        setShop(s);
        setOrders(o);
      })
      .finally(() => setLoading(false));
  }, [profile?.uid]);

  if (loading) return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Loading…</p>;

  if (!shop) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl mb-2">No shop yet</h1>
        <p className="text-muted mb-6">
          Your seller application is being processed, or a shop hasn&rsquo;t been
          created for your account.
        </p>
      </div>
    );
  }

  const pending = orders.filter((o) => o.status === "placed").length;
  const revenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl">{shop.shopName}</h1>
          <p className="text-muted mt-1">
            {shop.isActive ? "Live in your society" : "Not yet active"} · Plan:{" "}
            {shop.plan}
          </p>
        </div>
        <Link
          href="/seller/products"
          className="rounded-full bg-accent text-white px-5 py-2.5 font-medium hover:bg-accent/90 transition-colors"
        >
          Manage products
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-5 mb-10">
        <Stat label="Products listed" value={`${shop.productCount}/${shop.productLimit}`} />
        <Stat label="Orders awaiting action" value={String(pending)} />
        <Stat label="Delivered revenue" value={`₹${revenue.toFixed(0)}`} />
      </div>

      <Link href="/seller/orders" className="underline underline-offset-4 text-sm">
        View all orders →
      </Link>
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
