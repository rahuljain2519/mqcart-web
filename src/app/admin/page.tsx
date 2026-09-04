"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { getAnalyticsOverview } from "@/lib/data";
import type { AnalyticsOverview } from "@/types";

function AdminOverview() {
  const [stats, setStats] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsOverview()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Platform overview</h1>

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Stat label="Orders today" value={String(stats?.ordersToday ?? 0)} />
          <Stat label="GMV today" value={`₹${(stats?.gmvToday ?? 0).toFixed(0)}`} />
          <Stat label="Orders this month" value={String(stats?.ordersMonth ?? 0)} />
          <Stat label="GMV this month" value={`₹${(stats?.gmvMonth ?? 0).toFixed(0)}`} />
        </div>
      )}

      <p className="text-sm text-muted mt-8">
        These figures come from the <code>analytics_overview</code> document
        maintained by the existing nightly-aggregation and order-completion
        Cloud Functions.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line rounded-2xl bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-2xl mt-1">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <AdminOverview />
    </RoleGuard>
  );
}
