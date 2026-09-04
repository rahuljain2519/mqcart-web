"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { listOrdersByBuyer } from "@/lib/data";
import type { Order } from "@/types";

const statusColor: Record<string, string> = {
  placed: "bg-accent/10 text-accent-ink",
  accepted: "bg-green-bg text-green",
  delivered: "bg-green-bg text-green",
  cancelled: "bg-danger/10 text-danger",
};

function OrdersView() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    listOrdersByBuyer(profile.uid)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [profile?.uid]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">My orders</h1>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-muted">You haven&rsquo;t placed any orders yet.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="border border-line rounded-2xl bg-surface p-5">
              <div className="flex items-center justify-between">
                <p className="font-medium">{o.shopName}</p>
                <span
                  className={`text-xs rounded-full px-3 py-1 ${
                    statusColor[o.status] ?? "bg-line text-ink/70"
                  }`}
                >
                  {o.status}
                </span>
              </div>
              <ul className="text-sm text-muted mt-2">
                {o.items.map((it, idx) => (
                  <li key={idx}>
                    {it.name} × {it.quantity}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between mt-3 text-sm">
                <span className="text-muted">
                  {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}
                </span>
                <span className="font-medium">₹{o.totalAmount.toFixed(0)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RoleGuard allow={["buyer"]}>
      <OrdersView />
    </RoleGuard>
  );
}
