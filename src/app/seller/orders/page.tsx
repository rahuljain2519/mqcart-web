"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { watchOrdersBySeller, updateOrderStatus } from "@/lib/data";
import type { Order, OrderStatus } from "@/types";

const nextAction: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  placed: { label: "Accept order", next: "accepted" },
  accepted: { label: "Mark delivered", next: "delivered" },
};

function SellerOrders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = watchOrdersBySeller(profile.uid, setOrders);
    return () => unsub();
  }, [profile?.uid]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Orders</h1>

      {orders.length === 0 ? (
        <p className="text-muted">No orders yet.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => {
            const action = nextAction[o.status];
            return (
              <li key={o.id} className="border border-line rounded-2xl bg-surface p-5">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Flat {o.flatNumber}</p>
                  <span className="text-xs rounded-full bg-line px-3 py-1">{o.status}</span>
                </div>
                <ul className="text-sm text-muted mt-2">
                  {o.items.map((it, idx) => (
                    <li key={idx}>
                      {it.name} × {it.quantity}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-medium">₹{o.totalAmount.toFixed(0)}</span>
                  {action && (
                    <button
                      onClick={() => updateOrderStatus(o.id, action.next)}
                      className="text-sm rounded-full bg-ink text-bg px-4 py-1.5 hover:bg-ink/85 transition-colors"
                    >
                      {action.label}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function SellerOrdersPage() {
  return (
    <RoleGuard allow={["seller"]}>
      <SellerOrders />
    </RoleGuard>
  );
}
