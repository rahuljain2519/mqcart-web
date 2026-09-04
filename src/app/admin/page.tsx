"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { watchAnalyticsOverview } from "@/lib/data";
import type { AnalyticsOverview } from "@/types";

function AdminOverview() {
  const [stats, setStats] = useState<AnalyticsOverview | null | undefined>(undefined);

  useEffect(() => {
    const unsub = watchAnalyticsOverview(setStats);
    return () => unsub();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Platform overview</h1>

      {stats === undefined ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          <Stat label="Orders today" value={String(stats?.ordersToday ?? 0)} />
          <Stat label="GMV today" value={`₹${(stats?.gmvToday ?? 0).toFixed(0)}`} />
          <Stat label="Orders this month" value={String(stats?.ordersMonth ?? 0)} />
          <Stat label="GMV this month" value={`₹${(stats?.gmvMonth ?? 0).toFixed(0)}`} />
          <Stat label="Active sellers" value={String(stats?.activeSellers ?? 0)} />
          <Stat label="Active buyers" value={String(stats?.activeBuyers ?? 0)} />
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mt-10">
        <NavCard href="/admin/societies" title="Societies" body="Add or remove societies" />
        <NavCard href="/admin/users" title="Sellers" body="Manage sellers & their shops" />
        <NavCard
          href="/admin/sellers"
          title="Applications"
          body="Review seller applications"
        />
      </div>

      <p className="text-sm text-muted mt-8">
        Figures come from the <code>analytics_overview</code> document maintained by
        the order-completion and nightly-aggregation Cloud Functions.
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

function NavCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="border border-line rounded-2xl bg-surface p-5 hover:border-ink/30 transition-colors"
    >
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted mt-1">{body}</p>
    </Link>
  );
}

export default function AdminPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <AdminOverview />
    </RoleGuard>
  );
}
