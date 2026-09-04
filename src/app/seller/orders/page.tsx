"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import {
  watchOrdersBySeller,
  updateOrderStatus,
  restockForOrder,
  getUser,
} from "@/lib/data";
import type { Order, OrderStatus, AppUser } from "@/types";

const nextAction: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  placed: { label: "Accept", next: "accepted" },
  accepted: { label: "Mark delivered", next: "delivered" },
};

function SellerOrders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [buyers, setBuyers] = useState<Record<string, AppUser>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = watchOrdersBySeller(profile.uid, setOrders);
    return () => unsub();
  }, [profile?.uid]);

  // Fetch each distinct buyer once for name + phone.
  useEffect(() => {
    const ids = [...new Set((orders ?? []).map((o) => o.buyerId))].filter(
      (id) => !buyers[id]
    );
    ids.forEach((id) =>
      getUser(id).then((u) => {
        if (u) setBuyers((b) => ({ ...b, [id]: u }));
      })
    );
  }, [orders, buyers]);

  const groups = useMemo(() => {
    const list = orders ?? [];
    return {
      New: list.filter((o) => o.status === "placed"),
      "In progress": list.filter((o) => o.status === "accepted"),
      Delivered: list.filter((o) => o.status === "delivered"),
      Rejected: list.filter((o) => o.status === "rejected"),
    };
  }, [orders]);

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

      {orders === null ? (
        <p className="text-muted">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-muted">No orders yet.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([title, list]) =>
            list.length === 0 ? null : (
              <div key={title}>
                <h2 className="text-sm font-semibold text-ink/60 uppercase tracking-wide mb-3">
                  {title}
                </h2>
                <ul className="space-y-4">
                  {list.map((o) => {
                    const action = nextAction[o.status];
                    const busy = busyId === o.id;
                    const buyer = buyers[o.buyerId];
                    return (
                      <li
                        key={o.id}
                        className="border border-line rounded-2xl bg-surface p-5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {buyer?.name || "Buyer"} · Flat {o.flatNumber}
                          </p>
                          <span className="text-xs text-muted">
                            #{o.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-muted">{o.societyName}</p>

                        <ul className="text-sm text-muted mt-2">
                          {o.items.map((it, idx) => (
                            <li key={idx}>
                              {it.name} × {it.quantity}
                            </li>
                          ))}
                        </ul>

                        <div className="flex items-center justify-between mt-3">
                          <span className="font-medium">
                            ₹{o.totalAmount.toFixed(0)}
                          </span>
                          <div className="flex items-center gap-2">
                            {buyer?.phone &&
                              (o.status === "placed" || o.status === "accepted") && (
                                <a
                                  href={`tel:${buyer.phone}`}
                                  className="text-sm rounded-full border border-line px-4 py-1.5 hover:border-ink/40"
                                >
                                  Call buyer
                                </a>
                              )}
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
              </div>
            )
          )}
        </div>
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
