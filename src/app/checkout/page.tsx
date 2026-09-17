"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  createOrder,
  getShop,
  getSociety,
  reduceStockForOrder,
  newOrderId,
  createBuyerOrderPayment,
  createBuyerRazorpayOrder,
  markBuyerOrderPaymentFailed,
  watchOrder,
} from "@/lib/data";
import { openRazorpayCheckout } from "@/lib/razorpay";

function CheckoutView() {
  const { profile } = useAuth();
  const { items, total, clear, singleShopId } = useCart();
  const router = useRouter();
  const [flatNumber, setFlatNumber] = useState(profile?.flatNumber ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("cod");
  const [placing, setPlacing] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchingOrderId = useRef<string | null>(null);

  // Watch the pre-generated order doc once an online payment is started —
  // the razorpayWebhook creates it only after payment is actually captured.
  useEffect(() => {
    if (!waiting || !watchingOrderId.current) return;
    const unsub = watchOrder(watchingOrderId.current, (order) => {
      if (!order) return;
      clear();
      router.push("/orders");
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center text-muted">
        Your cart is empty.
      </div>
    );
  }

  const placeOrder = async () => {
    if (!profile || !singleShopId) return;
    setPlacing(true);
    setError(null);
    try {
      const [shop, society] = await Promise.all([
        getShop(singleShopId),
        getSociety(profile.societyId),
      ]);
      if (!shop) throw new Error("Shop not found.");

      const orderItems = items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        ...(i.optionName ? { optionName: i.optionName } : {}),
      }));

      if (paymentMethod === "razorpay") {
        // Doesn't reduce stock or create the order here — the webhook does
        // both, only once payment is actually captured.
        const orderId = newOrderId();
        const paymentDocId = await createBuyerOrderPayment({
          buyerId: profile.uid,
          sellerId: shop.sellerId,
          shopId: shop.shopId,
          societyId: profile.societyId,
          flatNumber,
          societyName: society?.name ?? "",
          shopName: shop.shopName,
          shopPhone: shop.phone,
          items: orderItems,
          totalAmount: total,
          orderId,
        });
        const razorpayOrderId = await createBuyerRazorpayOrder(paymentDocId);

        await openRazorpayCheckout({
          orderId: razorpayOrderId,
          description: "Order payment",
          contact: profile.phone,
          notes: { paymentDocId, buyerId: profile.uid, orderId },
          onDismiss: async () => {
            await markBuyerOrderPaymentFailed(paymentDocId, "Payment cancelled").catch(
              () => {}
            );
            watchingOrderId.current = null;
            setPlacing(false);
            setWaiting(false);
          },
          onError: (message) => {
            watchingOrderId.current = null;
            setError(message);
            setPlacing(false);
            setWaiting(false);
          },
        });

        watchingOrderId.current = orderId;
        setWaiting(true);
        setPlacing(false);
        return;
      }

      // Decrement stock atomically first — same order as the mobile checkout.
      // If this throws (item gone / under-stocked) the order is not created.
      await reduceStockForOrder(
        items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          optionName: i.optionName,
        }))
      );

      await createOrder({
        buyerId: profile.uid,
        sellerId: shop.sellerId,
        societyId: profile.societyId,
        societyName: society?.name ?? "",
        flatNumber,
        shopName: shop.shopName,
        shopPhone: shop.phone,
        items: orderItems,
        totalAmount: total,
        paymentMethod,
      });

      clear();
      router.push("/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order.");
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Checkout</h1>

      <div className="border border-line rounded-2xl bg-surface p-5 mb-5">
        <p className="text-sm text-muted mb-1">Deliver to</p>
        <label className="block">
          <span className="sr-only">Flat / block number</span>
          <input
            value={flatNumber}
            onChange={(e) => setFlatNumber(e.target.value)}
            placeholder="Flat / block number"
            className="w-full border border-line rounded-xl px-3 py-2 mt-1"
          />
        </label>
      </div>

      <div className="border border-line rounded-2xl bg-surface p-5 mb-5">
        <p className="text-sm text-muted mb-3">Payment method</p>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={waiting}
            onClick={() => setPaymentMethod("cod")}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60 ${
              paymentMethod === "cod"
                ? "border-ink bg-ink text-bg"
                : "border-line text-ink/80 hover:border-ink/40"
            }`}
          >
            Cash on delivery
          </button>
          <button
            type="button"
            disabled={waiting}
            onClick={() => setPaymentMethod("razorpay")}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60 ${
              paymentMethod === "razorpay"
                ? "border-ink bg-ink text-bg"
                : "border-line text-ink/80 hover:border-ink/40"
            }`}
          >
            UPI / Online
          </button>
        </div>
      </div>

      <div className="border border-line rounded-2xl bg-surface p-5 mb-6 flex items-center justify-between">
        <span className="text-muted">Total</span>
        <span className="font-display text-2xl">₹{total.toFixed(0)}</span>
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      {waiting && (
        <p className="text-sm text-green mb-4">Payment received — placing your order…</p>
      )}

      <button
        onClick={placeOrder}
        disabled={placing || waiting || !flatNumber}
        className="w-full rounded-full bg-accent text-white py-3 font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
      >
        {waiting
          ? "Waiting for payment…"
          : placing
            ? "Placing order…"
            : paymentMethod === "razorpay"
              ? "Pay & place order"
              : "Place order"}
      </button>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RoleGuard allow={["buyer", "seller"]}>
      <CheckoutView />
    </RoleGuard>
  );
}
