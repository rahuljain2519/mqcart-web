"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { listSellerApplications, decideSellerApplication } from "@/lib/data";
import type { SellerApplication } from "@/types";

function SellerApplications() {
  const [apps, setApps] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    listSellerApplications("pending").then(setApps).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const decide = async (uid: string, decision: "approved" | "rejected") => {
    await decideSellerApplication(uid, decision);
    await load();
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Seller applications</h1>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : apps.length === 0 ? (
        <p className="text-muted">No pending applications.</p>
      ) : (
        <ul className="space-y-4">
          {apps.map((a) => (
            <li key={a.uid} className="border border-line rounded-2xl bg-surface p-5">
              <p className="font-medium">{a.shopName}</p>
              <p className="text-sm text-muted">{a.category}</p>
              <p className="text-sm text-ink/70 mt-2">{a.description}</p>
              <p className="text-xs text-muted mt-3">
                {a.addressLine}, {a.city}, {a.state} {a.pincode}
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => decide(a.uid, "approved")}
                  className="text-sm rounded-full bg-green text-white px-4 py-1.5"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide(a.uid, "rejected")}
                  className="text-sm rounded-full border border-line px-4 py-1.5 hover:border-danger hover:text-danger"
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
