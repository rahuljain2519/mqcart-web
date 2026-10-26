"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import {
  watchOrdersBySeller,
  updateOrderStatus,
  rejectOrder,
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
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

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
      // Buyer backed out before the seller accepted - distinct from
      // Rejected (seller declined) so it's clear whose call it was.
      Cancelled: list.filter((o) => o.status === "cancelled"),
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

  const confirmReject = async () => {
    const o = rejecting;
    if (!o) return;
    if (!rejectReason.trim()) {
      setRejectError("Enter a reason for the buyer before rejecting.");
      return;
    }
    setBusyId(o.id);
    setRejectError(null);
    try {
      await restockForOrder(
        o.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          optionName: it.optionName,
        }))
      );
      await rejectOrder(o.id, rejectReason.trim());
      setRejecting(null);
      setRejectReason("");
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : "Could not reject the order.");
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
                        {o.status === "rejected" && o.rejectionReason && (
                          <p className="text-xs text-muted mt-1">
                            You rejected this: {o.rejectionReason}
                          </p>
                        )}

                        <ul className="text-sm text-muted mt-2">
                          {o.items.map((it, idx) => (
                            <li key={idx}>
                              {it.name}
                              {it.optionName ? ` (${it.optionName})` : ""} × {it.quantity}
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
                                // Desktop browsers usually can't place a tel:
                                // call — show the number itself.
                                <a
                                  href={`tel:${buyer.phone}`}
                                  className="text-sm rounded-full border border-line px-4 py-1.5 hover:border-ink/40"
                                >
                                  Call buyer: {buyer.phone}
                                </a>
                              )}
                            {o.status === "placed" && (
                              <button
                                onClick={() => {
                                  setRejecting(o);
                                  setRejectReason("");
                                  setRejectError(null);
                                }}
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

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5">
            <p className="font-medium text-lg">Reject this order?</p>
            <p className="text-sm text-muted mt-1">
              Tell the buyer why - they&rsquo;ll see this reason on their order.
            </p>
            <textarea
              autoFocus
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Out of stock, shop closed today…"
              rows={3}
              className="w-full border border-line rounded-xl px-3 py-2 bg-surface text-ink text-sm mt-3"
            />
            {rejectError && <p className="text-sm text-danger mt-2">{rejectError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={confirmReject}
                disabled={busyId === rejecting.id}
                className="flex-1 rounded-full bg-danger text-white px-4 py-2 text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-60"
              >
                {busyId === rejecting.id ? "Rejecting…" : "Reject order"}
              </button>
              <button
                onClick={() => {
                  setRejecting(null);
                  setRejectError(null);
                }}
                className="flex-1 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink/40"
              >
                Keep order
              </button>
            </div>
          </div>
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
