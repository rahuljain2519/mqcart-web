"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { watchOrder, getUser } from "@/lib/data";
import type { Order, AppUser } from "@/types";

const STATUS_LABEL: Record<Order["status"], string> = {
  placed: "Placed",
  accepted: "Accepted",
  delivered: "Delivered",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function fmtDateTime(d?: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Invoice() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [buyer, setBuyer] = useState<AppUser | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const unsub = watchOrder(orderId, setOrder);
    return () => unsub();
  }, [orderId]);

  useEffect(() => {
    if (!order?.buyerId) return;
    getUser(order.buyerId).then(setBuyer);
  }, [order?.buyerId]);

  if (order === undefined) {
    return <p className="mx-auto max-w-2xl px-5 py-16 text-muted">Loading…</p>;
  }
  if (!order) {
    return <p className="mx-auto max-w-2xl px-5 py-16 text-muted">Order not found.</p>;
  }

  const itemsTotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0);

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 print:py-0">
      <div className="flex items-center justify-between mb-8 print:hidden">
        <h1 className="font-display text-2xl">Invoice</h1>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-accent text-white px-5 py-2 text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="border border-line rounded-2xl p-6 print:border-0 print:p-0">
        <div className="flex items-start justify-between pb-4 border-b border-line">
          <div>
            <p className="font-display text-xl">{order.shopName}</p>
            {order.shopPhone && <p className="text-sm text-muted">{order.shopPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Order #{order.id.slice(-6).toUpperCase()}</p>
            <p className="text-sm text-muted">{fmtDateTime(order.createdAt)}</p>
            <p className="text-sm font-medium mt-1">{STATUS_LABEL[order.status]}</p>
          </div>
        </div>

        <div className="py-4 border-b border-line text-sm">
          <p className="text-muted mb-1">Delivered to</p>
          <p className="font-medium">{buyer?.name || "Buyer"}</p>
          <p>Flat {order.flatNumber}, {order.societyName}</p>
        </div>

        <table className="w-full text-sm py-4">
          <thead>
            <tr className="text-left text-muted border-b border-line">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, idx) => (
              <tr key={idx} className="border-b border-line/50">
                <td className="py-2">
                  {it.name}
                  {it.optionName ? ` (${it.optionName})` : ""}
                </td>
                <td className="py-2 text-right">{it.quantity}</td>
                <td className="py-2 text-right">₹{it.price.toFixed(0)}</td>
                <td className="py-2 text-right">₹{(it.price * it.quantity).toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end pt-2">
          <div className="w-48 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>₹{itemsTotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-medium text-base pt-1 border-t border-line">
              <span>Total</span>
              <span>₹{order.totalAmount.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-line text-sm text-muted space-y-1">
          <p>
            Payment: {order.paymentMethod === "razorpay" ? "Online (Razorpay)" : "Cash on delivery"}
            {" · "}
            {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus}
          </p>
          {order.razorpayPaymentId && <p>Payment reference: {order.razorpayPaymentId}</p>}
          {order.acceptedAt && <p>Accepted: {fmtDateTime(order.acceptedAt)}</p>}
          {order.deliveredAt && <p>Delivered: {fmtDateTime(order.deliveredAt)}</p>}
          {order.rejectedAt && <p>Rejected: {fmtDateTime(order.rejectedAt)}</p>}
          {order.cancelledAt && <p>Cancelled: {fmtDateTime(order.cancelledAt)}</p>}
          {order.rejectionReason && <p>Reason: {order.rejectionReason}</p>}
          {order.refundStatus && (
            <p>
              Refund: {order.refundStatus === "completed" ? "Completed" : order.refundStatus === "failed" ? "Failed" : "Initiated"}
              {order.refundedAt ? ` (${fmtDateTime(order.refundedAt)})` : ""}
              {order.razorpayRefundId ? ` · ${order.razorpayRefundId}` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvoicePage() {
  return (
    <RoleGuard allow={["buyer", "seller", "admin"]}>
      <Invoice />
    </RoleGuard>
  );
}
