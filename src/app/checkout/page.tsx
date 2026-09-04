"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { createOrder, getShop, getSociety } from "@/lib/data";

function CheckoutView() {
  const { profile } = useAuth();
  const { items, total, clear, singleShopId } = useCart();
  const router = useRouter();
  const [flatNumber, setFlatNumber] = useState(profile?.flatNumber ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay">("cod");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      await createOrder({
        buyerId: profile.uid,
        sellerId: shop.sellerId,
        societyId: profile.societyId,
        societyName: society?.name ?? "",
        flatNumber,
        shopName: shop.shopName,
        shopPhone: shop.phone,
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        totalAmount: total,
        paymentMethod,
      });

      clear();
      router.push("/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order.");
    } finally {
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
          <PayOption
            label="Cash on delivery"
            active={paymentMethod === "cod"}
            onClick={() => setPaymentMethod("cod")}
          />
          <PayOption
            label="Pay online"
            active={paymentMethod === "razorpay"}
            onClick={() => setPaymentMethod("razorpay")}
          />
        </div>
        {paymentMethod === "razorpay" && (
          <p className="text-xs text-muted mt-3">
            Online payment checkout is wired up on the seller-activation flow
            today; buyer-order payments can reuse the same Razorpay Cloud
            Function once that endpoint is extended.
          </p>
        )}
      </div>

      <div className="border border-line rounded-2xl bg-surface p-5 mb-6 flex items-center justify-between">
        <span className="text-muted">Total</span>
        <span className="font-display text-2xl">₹{total.toFixed(0)}</span>
      </div>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      <button
        onClick={placeOrder}
        disabled={placing || !flatNumber}
        className="w-full rounded-full bg-accent text-white py-3 font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
      >
        {placing ? "Placing order…" : "Place order"}
      </button>
    </div>
  );
}

function PayOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
        active ? "border-ink bg-ink text-bg" : "border-line hover:border-ink/40"
      }`}
    >
      {label}
    </button>
  );
}

export default function CheckoutPage() {
  return (
    <RoleGuard allow={["buyer"]}>
      <CheckoutView />
    </RoleGuard>
  );
}
