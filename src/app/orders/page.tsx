"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { watchOrdersByBuyer, getUser, cancelOrder, getProduct } from "@/lib/data";
import { stockFor } from "@/lib/product";
import { timeAgo } from "@/lib/format";
import RateProductDialog from "@/components/RateProductDialog";
import type { Order, OrderStatus } from "@/types";

const CHIP: Record<OrderStatus, string> = {
  placed: "bg-accent/10 text-accent-ink",
  accepted: "bg-line text-ink/70",
  delivered: "bg-green-bg text-green",
  rejected: "bg-danger/10 text-danger",
  cancelled: "bg-line text-ink/60",
};

const LABEL: Record<OrderStatus, string> = {
  placed: "Order placed",
  accepted: "Accepted",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STEPS: OrderStatus[] = ["placed", "accepted", "delivered"];
const STEP_LABELS = ["Placed", "Accepted", "Delivered"];

function Timeline({ status }: { status: OrderStatus }) {
  // Terminal, non-progressing states get their own single marker instead of
  // the 3-step tracker (which previously rendered nothing at all for these,
  // leaving the buyer with no visual status).
  if (status === "rejected" || status === "cancelled") {
    const label = status === "rejected" ? "Order rejected" : "Order cancelled";
    const dot = status === "rejected" ? "bg-danger" : "bg-ink/40";
    return (
      <div className="flex items-center gap-2 mt-3">
        <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <span className="text-xs text-ink/60">{label}</span>
      </div>
    );
  }
  const activeIdx = STEPS.indexOf(status);
  return (
    <div className="mt-3">
      <div className="flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                i <= activeIdx ? "bg-accent" : "bg-line"
              }`}
            />
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 ${i < activeIdx ? "bg-accent" : "bg-line"}`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={`text-[11px] ${i <= activeIdx ? "text-ink/80 font-medium" : "text-ink/40"}`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, buyerName }: { order: Order; buyerName: string }) {
  // shopPhone was never actually collected anywhere in shop creation/edit
  // (no phone field exists on ShopForm) - every historical order has it
  // empty. Fall back to the seller's own account phone, which is always
  // set (it's their login identifier), so "Call store" has a number to
  // call instead of silently doing nothing.
  const [fallbackPhone, setFallbackPhone] = useState<string | null>(null);
  useEffect(() => {
    if (order.shopPhone) return;
    let cancelled = false;
    getUser(order.sellerId).then((seller) => {
      if (!cancelled) setFallbackPhone(seller?.phone || null);
    });
    return () => {
      cancelled = true;
    };
  }, [order.shopPhone, order.sellerId]);

  const callPhone = order.shopPhone || fallbackPhone;
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const doCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelOrder(order);
      setConfirmingCancel(false);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Could not cancel the order.");
    } finally {
      setCancelling(false);
    }
  };

  const { addItem, updateQuantity, clear } = useCart();
  const [reordering, setReordering] = useState(false);
  const [reorderMsg, setReorderMsg] = useState<string | null>(null);
  const [reorderConflict, setReorderConflict] = useState(false);

  const doReorder = async (afterClear = false) => {
    setReordering(true);
    setReorderMsg(null);
    try {
      let added = 0;
      let unavailable = 0;
      if (afterClear) clear();
      for (const it of order.items) {
        const product = await getProduct(it.productId);
        const stock = product ? stockFor(product, it.optionName) : 0;
        if (!product || !product.isActive || stock <= 0) {
          unavailable++;
          continue;
        }
        const result = addItem(product, product.shopId, it.optionName);
        if (result === "different-shop") {
          setReorderConflict(true);
          return;
        }
        const qty = Math.min(it.quantity, stock);
        if (qty > 1) updateQuantity(product.id, qty, it.optionName);
        added++;
      }
      setReorderMsg(
        unavailable > 0
          ? `Added ${added} of ${order.items.length} items — ${unavailable} no longer available.`
          : `Added ${added} item${added === 1 ? "" : "s"} to cart.`
      );
    } finally {
      setReordering(false);
    }
  };

  return (
    <li className="border border-line rounded-2xl bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className={`text-xs rounded-full px-3 py-1 ${CHIP[order.status]}`}>
          {LABEL[order.status] ?? order.status}
        </span>
        <span className="text-xs text-muted">
          #{order.id.slice(-6).toUpperCase()}
        </span>
      </div>

      <p className="font-display text-2xl mt-2">₹{order.totalAmount.toFixed(0)}</p>
      <p className="text-sm text-muted">from {order.shopName}</p>

      <Timeline status={order.status} />

      {order.status === "rejected" && order.rejectionReason && (
        <p className="text-sm text-danger bg-danger/10 rounded-xl px-3 py-2 mt-3">
          Declined by the seller: {order.rejectionReason}
        </p>
      )}

      <div className="text-sm text-muted mt-3">
        <p className="text-ink/80 font-medium">Flat {order.flatNumber}</p>
        <p>{order.societyName}</p>
      </div>

      {(order.status === "placed" || order.status === "accepted") &&
        callPhone && (
          // Desktop browsers usually can't place a tel: call — show the
          // number itself (still a tel: link for the browsers/devices
          // that can act on it, e.g. mobile web).
          <a
            href={`tel:${callPhone}`}
            className="inline-flex items-center gap-1.5 mt-3 text-sm rounded-full bg-accent text-white px-4 py-1.5"
          >
            Call store: {callPhone}
          </a>
        )}

      {order.status === "placed" && (
        <>
          {cancelError && <p className="text-sm text-danger mt-2">{cancelError}</p>}
          <button
            onClick={() => setConfirmingCancel(true)}
            className="inline-block mt-3 ml-2 text-sm rounded-full border border-line px-4 py-1.5 hover:border-danger hover:text-danger transition-colors"
          >
            Cancel order
          </button>
          <ConfirmDialog
            open={confirmingCancel}
            title="Cancel this order?"
            message="The seller hasn't accepted it yet. This can't be undone."
            confirmLabel={cancelling ? "Cancelling…" : "Cancel order"}
            cancelLabel="Keep order"
            onConfirm={doCancel}
            onCancel={() => setConfirmingCancel(false)}
          />
        </>
      )}

      <ul className="text-sm mt-3 divide-y divide-line border-t border-line">
        {order.items.map((it, idx) => (
          <li key={idx} className="py-2 flex items-center justify-between gap-2">
            <Link
              href={`/product/${it.productId}`}
              className="hover:underline text-ink/80 min-w-0 truncate"
            >
              {it.name}
              {it.optionName ? ` (${it.optionName})` : ""} × {it.quantity}
            </Link>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-muted">₹{(it.price * it.quantity).toFixed(0)}</span>
              {order.status === "delivered" && (
                <RateProductDialog order={order} item={it} buyerName={buyerName} />
              )}
            </span>
          </li>
        ))}
      </ul>

      <p
        className="text-xs text-muted mt-3"
        title={order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
      >
        {timeAgo(order.createdAt)}
      </p>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => doReorder()}
          disabled={reordering}
          className="text-sm rounded-full border border-line px-4 py-1.5 hover:border-ink/40 transition-colors disabled:opacity-60"
        >
          {reordering ? "Adding…" : "Reorder"}
        </button>
        <Link
          href={`/orders/${order.id}/invoice`}
          className="text-sm rounded-full border border-line px-4 py-1.5 hover:border-ink/40 transition-colors"
        >
          Invoice
        </Link>
      </div>
      {reorderMsg && <p className="text-sm text-green mt-2">{reorderMsg}</p>}

      <ConfirmDialog
        open={reorderConflict}
        title="Switch shop?"
        message="Your cart has items from a different shop. Clear your cart and add this order's items instead?"
        confirmLabel="Clear & Add"
        onCancel={() => setReorderConflict(false)}
        onConfirm={() => {
          setReorderConflict(false);
          doReorder(true);
        }}
      />
    </li>
  );
}

function OrdersView() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const unsub = watchOrdersByBuyer(profile.uid, setOrders);
    return () => unsub();
  }, [profile?.uid]);

  const buyerName = profile?.name ?? "Buyer";
  const active = orders?.filter((o) => o.status === "placed" || o.status === "accepted") ?? [];
  const delivered = orders?.filter((o) => o.status === "delivered") ?? [];
  const rejected = orders?.filter((o) => o.status === "rejected") ?? [];
  const cancelled = orders?.filter((o) => o.status === "cancelled") ?? [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">My orders</h1>

      {orders === null ? (
        <p className="text-muted">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-2">🧾</div>
          <p className="font-medium">No orders yet</p>
          <p className="text-sm text-muted">
            Your orders and their status will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <Section title="Active">
              {active.map((o) => (
                <OrderCard key={o.id} order={o} buyerName={buyerName} />
              ))}
            </Section>
          )}
          {delivered.length > 0 && (
            <Section title="Delivered">
              {delivered.map((o) => (
                <OrderCard key={o.id} order={o} buyerName={buyerName} />
              ))}
            </Section>
          )}
          {rejected.length > 0 && (
            <Section title="Rejected">
              {rejected.map((o) => (
                <OrderCard key={o.id} order={o} buyerName={buyerName} />
              ))}
            </Section>
          )}
          {cancelled.length > 0 && (
            <Section title="Cancelled">
              {cancelled.map((o) => (
                <OrderCard key={o.id} order={o} buyerName={buyerName} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink/60 uppercase tracking-wide mb-3">
        {title}
      </h2>
      <ul className="space-y-4">{children}</ul>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RoleGuard allow={["buyer", "seller"]}>
      <OrdersView />
    </RoleGuard>
  );
}
