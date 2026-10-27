"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { listRecentActivity, getUser } from "@/lib/data";
import type { ActivityLogEntry, AppUser } from "@/types";

const ACTION_LABELS: Record<string, string> = {
  "order.placed": "Order placed",
  "order.accepted": "Order accepted",
  "order.rejected": "Order rejected",
  "order.delivered": "Order delivered",
  "order.cancelled": "Order cancelled",
  "seller.application_submitted": "Seller application submitted",
  "seller.approved": "Seller approved",
  "seller.rejected": "Seller application rejected",
  "seller.bank_details_updated": "Bank details updated",
  "seller.deleted": "Seller account deleted",
  "seller.activation_payment_completed": "Seller plan payment completed",
  "seller.plan_expired": "Seller plan expired",
  "product.added": "Product added",
  "product.edited": "Product edited",
  "product.deleted": "Product deleted",
  "shop.created": "Shop created",
  "shop.activated": "Shop activated",
  "shop.deactivated": "Shop deactivated",
  "settlement.marked_paid": "Settlement marked paid",
  "profile.address_changed": "Delivery address changed",
};

const ACTION_COLORS: Record<string, string> = {
  "order.rejected": "bg-danger/10 text-danger",
  "order.cancelled": "bg-danger/10 text-danger",
  "seller.rejected": "bg-danger/10 text-danger",
  "seller.deleted": "bg-danger/10 text-danger",
  "shop.deactivated": "bg-danger/10 text-danger",
  "seller.plan_expired": "bg-danger/10 text-danger",
  "seller.approved": "bg-green-bg text-green",
  "order.delivered": "bg-green-bg text-green",
  "settlement.marked_paid": "bg-green-bg text-green",
};

function describe(entry: ActivityLogEntry): string {
  const m = entry.metadata as Record<string, unknown>;
  switch (entry.action) {
    case "order.placed":
    case "order.accepted":
    case "order.delivered":
    case "order.cancelled":
      return [m.shopName, m.totalAmount ? `₹${m.totalAmount}` : null]
        .filter(Boolean)
        .join(" · ");
    case "order.rejected":
      return [m.shopName, m.reason ? `reason: ${m.reason}` : null]
        .filter(Boolean)
        .join(" · ");
    case "seller.application_submitted":
    case "shop.created":
    case "shop.activated":
    case "shop.deactivated":
      return (m.shopName as string) || "";
    case "product.added":
    case "product.edited":
    case "product.deleted":
      return (m.name as string) || "";
    case "settlement.marked_paid":
      return m.totalAmount ? `₹${m.totalAmount}` : "";
    case "seller.activation_payment_completed":
    case "seller.plan_expired":
      return (m.plan as string) || "";
    case "profile.address_changed":
      return (m.societyId as string) ? `society: ${m.societyId}` : "";
    default:
      return "";
  }
}

function ActivityLog() {
  const [entries, setEntries] = useState<ActivityLogEntry[] | null>(null);
  const [actors, setActors] = useState<Record<string, AppUser>>({});
  const [error, setError] = useState<string | null>(null);

  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    listRecentActivity(500)
      .then(setEntries)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load activity.")
      );
  }, []);

  // Resolve each distinct actor once for a name/role to display and filter by.
  useEffect(() => {
    const ids = [...new Set((entries ?? []).map((e) => e.actorId))].filter(
      (id) => id && !actors[id]
    );
    ids.forEach((id) =>
      getUser(id).then((u) => {
        if (u) setActors((a) => ({ ...a, [id]: u }));
      })
    );
  }, [entries, actors]);

  const actionTypes = useMemo(
    () => [...new Set((entries ?? []).map((e) => e.action))].sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    let rows = entries ?? [];
    if (actionFilter) rows = rows.filter((r) => r.action === actionFilter);
    if (actorFilter.trim()) {
      const q = actorFilter.trim().toLowerCase();
      rows = rows.filter((r) => {
        const actor = actors[r.actorId];
        return (
          actor?.name?.toLowerCase().includes(q) ||
          actor?.phone?.includes(q) ||
          r.actorId.toLowerCase().includes(q)
        );
      });
    }
    if (startDate) {
      const from = new Date(startDate);
      rows = rows.filter((r) => r.createdAt && r.createdAt >= from);
    }
    if (endDate) {
      const to = new Date(endDate + "T23:59:59.999");
      rows = rows.filter((r) => r.createdAt && r.createdAt <= to);
    }
    return rows;
  }, [entries, actors, actionFilter, actorFilter, startDate, endDate]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="font-display text-3xl mb-2">Activity log</h1>
      <p className="text-muted mb-8">
        Meaningful account actions across the platform - orders, seller approvals,
        catalog changes, settlements. Most recent {entries?.length ?? 0} events shown;
        filter below.
      </p>

      <div className="border border-line rounded-2xl bg-surface p-5 space-y-4 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block">
            <span className="text-sm text-ink/60">Actor (name / phone / uid)</span>
            <input
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              placeholder="Search…"
              className="w-full border border-line rounded-lg px-3 py-2 mt-1 bg-bg"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink/60">Action</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mt-1 bg-bg"
            >
              <option value="">All</option>
              {actionTypes.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a] ?? a}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-ink/60">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mt-1 bg-bg"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink/60">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mt-1 bg-bg"
            />
          </label>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {entries && (
          <p className="text-sm text-muted">{filtered.length} of {entries.length} events</p>
        )}
      </div>

      {entries === null ? (
        <p className="text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">No events match these filters.</p>
      ) : (
        <div className="border border-line rounded-2xl bg-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/60">
                <th className="px-3 py-2 whitespace-nowrap">When</th>
                <th className="px-3 py-2 whitespace-nowrap">Actor</th>
                <th className="px-3 py-2 whitespace-nowrap">Action</th>
                <th className="px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const actor = actors[e.actorId];
                return (
                  <tr key={e.id} className="border-b border-line last:border-b-0">
                    <td className="px-3 py-2 whitespace-nowrap text-muted">
                      {e.createdAt
                        ? e.createdAt.toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {actor?.name || actor?.phone || e.actorId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`text-xs rounded-full px-3 py-1 ${
                          ACTION_COLORS[e.action] ?? "bg-line text-ink/70"
                        }`}
                      >
                        {ACTION_LABELS[e.action] ?? e.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted max-w-sm truncate" title={describe(e)}>
                      {describe(e)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminActivityPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <ActivityLog />
    </RoleGuard>
  );
}
