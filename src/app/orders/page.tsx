"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { watchOrdersByBuyer } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import type { Order, OrderStatus } from "@/types";

const CHIP: Record<OrderStatus, string> = {
  placed: "bg-accent/10 text-accent-ink",
  accepted: "bg-line text-ink/70",
  delivered: "bg-green-bg text-green",
  rejected: "bg-danger/10 text-danger",
};

const LABEL: Record<OrderStatus, string> = {
  placed: "Order placed",
  accepted: "Accepted",
  delivered: "Delivered",
  rejected: "Rejected",
};

const STEPS: OrderStatus[] = ["placed", "accepted", "delivered"];

function Timeline({ status }: { status: OrderStatus }) {
  if (status === "rejected") return null;
  const activeIdx = STEPS.indexOf(status);
  return (
    <div className="flex items-center mt-3">
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
  );
}

function OrderCard({ order }: { order: Order }) {
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

      <div className="text-sm text-muted mt-3">
        <p className="text-ink/80 font-medium">Flat {order.flatNumber}</p>
        <p>{order.societyName}</p>
      </div>

      {(order.status === "placed" || order.status === "accepted") &&
        order.shopPhone && (
          <a
            href={`tel:${order.shopPhone}`}
            className="inline-block mt-3 text-sm rounded-full bg-accent text-white px-4 py-1.5"
          >
            Call store
          </a>
        )}

      <ul className="text-sm mt-3 divide-y divide-line border-t border-line">
        {order.items.map((it, idx) => (
          <li key={idx} className="py-2 flex items-center justify-between">
            <Link
              href={`/product/${it.productId}`}
              className="hover:underline text-ink/80"
            >
              {it.name}
              {it.optionName ? ` (${it.optionName})` : ""} × {it.quantity}
            </Link>
            <span className="text-muted">₹{(it.price * it.quantity).toFixed(0)}</span>
          </li>
        ))}
      </ul>

      <p
        className="text-xs text-muted mt-3"
        title={order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}
      >
        {timeAgo(order.createdAt)}
      </p>
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

  const active = orders?.filter((o) => o.status === "placed" || o.status === "accepted") ?? [];
  const delivered = orders?.filter((o) => o.status === "delivered") ?? [];
  const rejected = orders?.filter((o) => o.status === "rejected") ?? [];

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
                <OrderCard key={o.id} order={o} />
              ))}
            </Section>
          )}
          {delivered.length > 0 && (
            <Section title="Delivered">
              {delivered.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </Section>
          )}
          {rejected.length > 0 && (
            <Section title="Rejected">
              {rejected.map((o) => (
                <OrderCard key={o.id} order={o} />
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
    <RoleGuard allow={["buyer"]}>
      <OrdersView />
    </RoleGuard>
  );
}
