"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { watchSellerApplications, decideSellerApplication } from "@/lib/data";
import type { SellerApplication } from "@/types";

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-32 shrink-0 text-muted">{label}</span>
      <span className="text-ink/80 break-all">{value}</span>
    </div>
  );
}

function SellerApplications() {
  const [apps, setApps] = useState<SellerApplication[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const unsub = watchSellerApplications("pending", setApps);
    return () => unsub();
  }, []);

  const decide = async (uid: string, decision: "approved" | "rejected") => {
    setBusy(uid);
    try {
      await decideSellerApplication(uid, decision);
      // list updates itself via the snapshot listener
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Seller applications</h1>

      {apps === null ? (
        <p className="text-muted">Loading…</p>
      ) : apps.length === 0 ? (
        <p className="text-muted">No pending applications.</p>
      ) : (
        <ul className="space-y-4">
          {apps.map((a) => (
            <li key={a.uid} className="border border-line rounded-2xl bg-surface p-5">
              <p className="font-medium text-lg">{a.shopName}</p>
              <p className="text-sm text-muted mb-3">
                {a.category} · {a.businessType}
              </p>
              <p className="text-sm text-ink/70 mb-4">{a.description}</p>

              <div className="space-y-1.5 border-t border-line pt-3">
                <Row label="PAN" value={a.panNumber} />
                <Row label="Aadhaar (last 4)" value={a.aadhaarLast4} />
                <Row label="GSTIN" value={a.gstin} />
                <Row
                  label="Address"
                  value={`${a.addressLine}, ${a.city}, ${a.state} ${a.pincode}`}
                />
                <Row label="Bank account" value={a.bankAccountNumber} />
                <Row label="IFSC" value={a.ifscCode} />
                <Row label="Account name" value={a.bankName} />
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => decide(a.uid, "approved")}
                  disabled={busy === a.uid}
                  className="text-sm rounded-full bg-green text-white px-4 py-1.5 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide(a.uid, "rejected")}
                  disabled={busy === a.uid}
                  className="text-sm rounded-full border border-line px-4 py-1.5 hover:border-danger hover:text-danger disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminSellersPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <SellerApplications />
    </RoleGuard>
  );
}
