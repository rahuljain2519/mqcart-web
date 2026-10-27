"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import {
  getShopBySeller,
  getSellerPlans,
  getSellerSubscription,
  watchShopById,
  activateFreePlan,
  activateShopPlan,
  createActivationPayment,
  createSellerRazorpayOrder,
  markActivationPaymentFailed,
  FREE_PLAN_CUTOFF,
  isFreePlanWindowClosed,
} from "@/lib/data";
import { openRazorpayCheckout } from "@/lib/razorpay";
import type { Shop, SellerPlan } from "@/types";

const FREE_PLAN_CUTOFF_LABEL = FREE_PLAN_CUTOFF.toLocaleDateString("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function Activate() {
  const { profile } = useAuth();
  const router = useRouter();

  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [plans, setPlans] = useState<SellerPlan[]>([]);
  const [freeUsed, setFreeUsed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingFree, setConfirmingFree] = useState(false);
  const paymentDocId = useRef<string | null>(null);
  const enforced = useRef(false);
  const freeWindowClosed = isFreePlanWindowClosed();

  useEffect(() => {
    if (!profile?.uid) return;
    getShopBySeller(profile.uid).then((s) => {
      setShop(s);
      setSelected(s?.plan ?? null);
    });
    getSellerPlans().then(setPlans);
    getSellerSubscription(profile.uid).then((sub) =>
      setFreeUsed(sub?.freePlanUsed === true)
    );
  }, [profile?.uid]);

  // After a paid payment, the webhook flips planStatus -> active. Watch for it.
  useEffect(() => {
    if (!shop?.shopId) return;
    const unsub = watchShopById(shop.shopId, (s) => {
      if (!s) return;
      if (waiting && s.planStatus === "active") {
        if (!enforced.current) {
          enforced.current = true;
          // Client-side limit enforcement, same as the app (fire and forget).
          activateShopPlan({
            shopId: s.shopId,
            plan: s.plan,
            productLimit: s.productLimit,
          }).catch(() => {});
        }
        router.replace("/seller");
      }
    });
    return () => unsub();
  }, [shop?.shopId, waiting, router]);

  const doActivateFree = async (plan: SellerPlan) => {
    if (!shop || !profile) return;
    setError(null);
    setProcessing(true);
    try {
      await activateFreePlan({
        sellerId: profile.uid,
        shopId: shop.shopId,
        plan,
      });
      router.replace("/seller");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not activate the free plan.");
    } finally {
      setProcessing(false);
      setConfirmingFree(false);
    }
  };

  const proceed = async () => {
    if (!shop || !profile || !selected) return;
    const plan = plans.find((p) => p.key === selected);
    if (!plan) return;

    if (plan.monthlyFee === 0) {
      if (freeUsed) {
        setError("You've already used the free plan. Pick a paid plan.");
        return;
      }
      if (freeWindowClosed) {
        setError(`The free plan ended on ${FREE_PLAN_CUTOFF_LABEL}. Pick a paid plan.`);
        return;
      }
      // Notify the seller up front, before activating, that the free
      // plan isn't permanent.
      setConfirmingFree(true);
      return;
    }

    setError(null);
    setProcessing(true);
    try {
      // Paid: create the payment record, get a Razorpay order, open checkout.
      paymentDocId.current = await createActivationPayment({
        sellerId: profile.uid,
        shopId: shop.shopId,
        plan: plan.key,
        monthlyFee: plan.monthlyFee,
        productLimit: plan.productLimit,
      });
      const orderId = await createSellerRazorpayOrder(paymentDocId.current);

      await openRazorpayCheckout({
        orderId,
        contact: auth.currentUser?.phoneNumber ?? "",
        email: auth.currentUser?.email ?? "",
        notes: { paymentDocId: paymentDocId.current, sellerId: profile.uid },
        onDismiss: async () => {
          setWaiting(false);
          if (paymentDocId.current) {
            await markActivationPaymentFailed(
              paymentDocId.current,
              "Payment cancelled"
            ).catch(() => {});
            paymentDocId.current = null;
          }
        },
        onError: (m) => setError(m),
      });
      setWaiting(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start activation.");
    } finally {
      setProcessing(false);
    }
  };

  if (shop === undefined) {
    return <p className="mx-auto max-w-2xl px-5 py-12 text-muted">Loading…</p>;
  }
  if (!shop) {
    return <p className="mx-auto max-w-2xl px-5 py-12 text-muted">Create your shop first.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl mb-2">Choose a plan</h1>
      <p className="text-muted mb-8">
        Your shop goes live once a plan is active.
      </p>

      <div className="space-y-3">
        {plans.map((p) => {
          const isFree = p.monthlyFee === 0;
          const disabled = isFree && (freeUsed || freeWindowClosed);
          const isCurrent = shop.plan === p.key && shop.isActive;
          return (
            <button
              key={p.key}
              disabled={disabled || waiting}
              onClick={() => setSelected(p.key)}
              className={`w-full text-left rounded-2xl border p-4 transition-colors ${
                selected === p.key
                  ? "border-accent bg-accent/5"
                  : "border-line hover:border-ink/30"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.name}</span>
                {isCurrent && (
                  <span className="text-xs text-green font-medium">Current</span>
                )}
              </div>
              <p className="text-sm mt-1">
                {isFree ? "Free" : `₹${p.monthlyFee} / month`}
              </p>
              <p className="text-sm text-muted">Up to {p.productLimit} products</p>
              {isFree && freeUsed && (
                <p className="text-xs text-danger mt-1">Free plan already used</p>
              )}
              {isFree && !freeUsed && freeWindowClosed && (
                <p className="text-xs text-danger mt-1">
                  Free plan ended {FREE_PLAN_CUTOFF_LABEL}
                </p>
              )}
              {isFree && !freeUsed && !freeWindowClosed && (
                <p className="text-xs text-muted mt-1">
                  Free until {FREE_PLAN_CUTOFF_LABEL}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-danger mt-4">{error}</p>}
      {waiting && (
        <p className="text-sm text-green mt-4">
          Payment received — activating your plan…
        </p>
      )}

      <button
        onClick={proceed}
        disabled={!selected || processing || waiting}
        className="mt-6 w-full rounded-full bg-accent text-white py-3 font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
      >
        {processing ? "Please wait…" : "Continue"}
      </button>

      <ConfirmDialog
        open={confirmingFree}
        title="Activate free plan?"
        message={`Your shop will go live on the free plan until ${FREE_PLAN_CUTOFF_LABEL}. After that date you'll need to choose a paid plan to stay visible to buyers — your products won't be deleted, just hidden until you do.`}
        confirmLabel={processing ? "Activating…" : "Activate"}
        onCancel={() => setConfirmingFree(false)}
        onConfirm={() => {
          const plan = plans.find((p) => p.key === selected);
          if (plan) doActivateFree(plan);
        }}
      />
    </div>
  );
}

export default function ActivatePage() {
  return (
    <RoleGuard allow={["seller"]}>
      <Activate />
    </RoleGuard>
  );
}
