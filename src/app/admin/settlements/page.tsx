"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import {
  listUnsettledAmountsBySeller,
  markOrdersSettled,
  listSettlementsForSeller,
  type UnsettledSellerTotal,
} from "@/lib/data";
import type { Settlement } from "@/types";

function SellerRow({
  total,
  onSettled,
}: {
  total: UnsettledSellerTotal;
  onSettled: () => void;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Settlement[] | null>(null);

  useEffect(() => {
    if (open && history === null) {
      listSettlementsForSeller(total.sellerId).then(setHistory);
    }
  }, [open, history, total.sellerId]);

  const settle = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      await markOrdersSettled({
        sellerId: total.sellerId,
        shopName: total.shopName,
        orderIds: total.orderIds,
        totalAmount: total.totalAmount,
        note: note.trim(),
        settledBy: profile.uid,
      });
      onSettled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record settlement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <span>
          <span className="font-medium">{total.shopName || "(unnamed shop)"}</span>{" "}
          <span className="text-sm text-muted">· {total.orderIds.length} orders</span>
        </span>
        <span className="font-display text-xl">₹{total.totalAmount.toFixed(0)}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4 text-sm">
          <div>
            <p className="text-ink/60 mb-1">
              Pay ₹{total.totalAmount.toFixed(0)} to this seller by bank transfer/UPI outside
              MQ Cart, then record it here.
            </p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note — e.g. UPI ref number"
              className="w-full border border-line rounded-lg px-3 py-2 bg-bg"
            />
          </div>
          {error && <p className="text-danger">{error}</p>}
          <button
            onClick={settle}
            disabled={busy}
            className="rounded-full bg-ink text-bg px-4 py-1.5 disabled:opacity-60"
          >
            {busy ? "Recording…" : "Mark as paid"}
          </button>

          <div className="border-t border-line pt-3">
            <p className="text-ink/60 mb-1">Past settlements</p>
            {history === null ? (
              <p className="text-muted">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-muted">None yet.</p>
            ) : (
              <ul className="space-y-1">
                {history.map((s) => (
                  <li key={s.id} className="text-muted">
                    ₹{s.totalAmount.toFixed(0)} · {s.orderIds.length} orders ·{" "}
                    {s.settledAt?.toLocaleDateString() ?? "—"}
                    {s.note ? ` · ${s.note}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Settlements() {
  const [totals, setTotals] = useState<UnsettledSellerTotal[] | null>(null);

  const load = () => listUnsettledAmountsBySeller().then(setTotals);
  useEffect(() => {
    load();
  }, []);

  const grandTotal = totals?.reduce((sum, t) => sum + t.totalAmount, 0) ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl mb-2">Seller settlements</h1>
      <p className="text-muted mb-8">
        Online orders collect into MQ Cart&apos;s Razorpay account with no automatic payout yet.
        Pay each seller their share directly, then record it here so it drops off this list.
      </p>

      {totals === null ? (
        <p className="text-muted">Loading…</p>
      ) : totals.length === 0 ? (
        <p className="text-muted">Nothing owed to any seller right now.</p>
      ) : (
        <>
          <p className="text-sm text-muted mb-4">
            Total owed across all sellers: <span className="font-medium text-ink">₹{grandTotal.toFixed(0)}</span>
          </p>
          <ul className="border border-line rounded-2xl bg-surface divide-y divide-line">
            {totals.map((t) => (
              <SellerRow key={t.sellerId} total={t} onSettled={load} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function AdminSettlementsPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <Settlements />
    </RoleGuard>
  );
}
