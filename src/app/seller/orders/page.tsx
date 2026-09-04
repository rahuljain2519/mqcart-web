"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import {
  watchOrdersBySeller,
  updateOrderStatus,
  restockForOrder,
} from "@/lib/data";
import type { Order, OrderStatus } from "@/types";

const nextAction: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  placed: { label: "Accept order", next: "accepted" },
  accepted: { label: "Mark delivered", next: "delivered" },
};

const statusChip: Record<OrderStatus, string> = {
  placed: "bg-accent/10 text-accent-ink",
  accepted: "bg-line text-ink/70",
  delivered: "bg-green-bg text-green",
  rejected: "bg-danger/10 text-danger",
};

function SellerOrders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = watchOrdersBySeller(profile.uid, setOrders);
    return () => unsub();
  }, [profile?.uid]);

  const advance = async (o: Order, next: OrderStatus) => {
    setBusyId(o.id);
    setError(null);
    try {
      await updateOrderStatus(o.id, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the order.");
    } finally {
      setBusyId(null);
    }
  };

  // Reject = return stock to inventory, then mark rejected (same as the app).
  const reject = async (o: Order) => {
    setBusyId(o.id);
    setError(null);
    try {
      await restockForOrder(
        o.items.map((it) => ({ productId: it.productId, quantity: it.quantity }))
      );
      await updateOrderStatus(o.id, "rejected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject the order.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Orders</h1>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {orders.length === 0 ? (
        <p className="text-muted">No orders yet.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => {
            const action = nextAction[o.status];
            const busy = busyId === o.id;
            return (
              <li key={o.id} className="border border-line rounded-2xl bg-surface p-5">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Flat {o.flatNumber}</p>
                  <span
                    className={`text-xs rounded-full px-3 py-1 ${statusChip[o.status] ?? "bg-line text-ink/70"}`}
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
                <div className="flex items-center justify-between mt-3">
                  <span className="font-medium">₹{o.totalAmount.toFixed(0)}</span>
                  <div className="flex items-center gap-2">
                    {o.status === "placed" && (
                      <button
                        onClick={() => reject(o)}
                        disabled={busy}
                        className="text-sm rounded-full border border-line px-4 py-1.5 hover:border-danger hover:text-danger transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}
                    {action && (
                      <button
                        onClick={() => advance(o, action.next)}
                        disabled={busy}
                        className="text-sm rounded-full bg-ink text-bg px-4 py-1.5 hover:bg-ink/85 transition-colors disabled:opacity-50"
                      >
                        {action.label}
                      </button>
                    )}
                  </div>
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
