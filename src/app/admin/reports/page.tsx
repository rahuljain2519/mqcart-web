"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import {
  buildTransactionsReport,
  transactionsReportToCsv,
  listUsersByRole,
  listAllSocieties,
  updateOrderSettlementStatus,
  type TransactionReportRow,
} from "@/lib/data";
import type { AppUser, Society } from "@/types";

function downloadCsv(filename: string, content: string) {
  // Prefix with a UTF-8 BOM so Excel renders the rupee sign correctly
  // instead of mangling it.
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const PAYMENT_TYPES = [
  { value: "", label: "All" },
  { value: "cod", label: "COD" },
  { value: "razorpay", label: "Online (Razorpay)" },
];

function Reports() {
  const { profile } = useAuth();
  const [sellers, setSellers] = useState<AppUser[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);

  const [sellerId, setSellerId] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [rows, setRows] = useState<TransactionReportRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  useEffect(() => {
    listUsersByRole("seller").then(setSellers).catch(() => setSellers([]));
    listAllSocieties().then(setSocieties).catch(() => setSocieties([]));
  }, []);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await buildTransactionsReport({
        startDate: startDate ? new Date(startDate) : undefined,
        // Include the whole end day, not just midnight.
        endDate: endDate ? new Date(endDate + "T23:59:59.999") : undefined,
        sellerId: sellerId || undefined,
        societyId: societyId || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      setRows(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the report.");
    } finally {
      setBusy(false);
    }
  };

  const toggleSettled = async (row: TransactionReportRow) => {
    if (!profile) return;
    setStatusBusyId(row.orderId);
    try {
      await updateOrderSettlementStatus({
        orderId: row.orderId,
        sellerId: row.sellerId,
        shopName: row.shopName,
        settlementAmount: row.settlementAmount,
        settled: !row.settled,
        settledBy: profile.uid,
      });
      setRows((prev) =>
        prev
          ? prev.map((r) => (r.orderId === row.orderId ? { ...r, settled: !r.settled } : r))
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update settlement status.");
    } finally {
      setStatusBusyId(null);
    }
  };

  const total = useMemo(
    () => (rows ?? []).reduce((sum, r) => sum + r.totalAmount, 0),
    [rows]
  );
  const settlementTotal = useMemo(
    () => (rows ?? []).reduce((sum, r) => sum + r.settlementAmount, 0),
    [rows]
  );

  const exportFiltered = () => {
    if (!rows) return;
    const csv = transactionsReportToCsv(rows);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`mqcart-transactions-${today}.csv`, csv);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-display text-3xl mb-2">Transaction report</h1>
      <p className="text-muted mb-8">
        Every order (COD and online) — transaction type, seller name, shop name, bank account
        &amp; IFSC, society, order ID, product details, date, and the seller&apos;s settlement
        amount (online orders have a 2.4% platform commission deducted; COD keeps 100%, since the
        seller already collected that cash directly). Tap Pending/Paid on an online order to mark
        it settled right here. Filter below, then export exactly what&apos;s shown.
      </p>

      <div className="border border-line rounded-2xl bg-surface p-5 space-y-4 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <label className="block">
            <span className="text-sm text-ink/60">Seller</span>
            <select
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mt-1 bg-bg"
            >
              <option value="">All</option>
              {sellers.map((s) => (
                <option key={s.uid} value={s.uid}>
                  {s.name || s.phone}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-ink/60">Society</span>
            <select
              value={societyId}
              onChange={(e) => setSocietyId(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mt-1 bg-bg"
            >
              <option value="">All</option>
              {societies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-ink/60">Payment type</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mt-1 bg-bg"
            >
              {PAYMENT_TYPES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
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

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={load}
            disabled={busy}
            className="rounded-full bg-ink text-bg px-6 py-2.5 font-medium disabled:opacity-60"
          >
            {busy ? "Loading…" : "Apply filters"}
          </button>
          <button
            onClick={exportFiltered}
            disabled={!rows || rows.length === 0}
            className="rounded-full border border-line px-6 py-2.5 font-medium disabled:opacity-40"
          >
            Export CSV
          </button>
          {rows && (
            <span className="text-sm text-muted">
              {rows.length} transactions · ₹{total.toFixed(0)} gross · ₹
              {settlementTotal.toFixed(0)} settlement amount
            </span>
          )}
        </div>
      </div>

      {rows !== null && (
        <div className="border border-line rounded-2xl bg-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/60">
                <th className="px-3 py-2 whitespace-nowrap">Order ID</th>
                <th className="px-3 py-2 whitespace-nowrap">Date</th>
                <th className="px-3 py-2 whitespace-nowrap">Type</th>
                <th className="px-3 py-2 whitespace-nowrap">Payment</th>
                <th className="px-3 py-2 whitespace-nowrap">Order Status</th>
                <th className="px-3 py-2 whitespace-nowrap">Society</th>
                <th className="px-3 py-2 whitespace-nowrap">Seller</th>
                <th className="px-3 py-2 whitespace-nowrap">Shop</th>
                <th className="px-3 py-2 whitespace-nowrap">Bank account</th>
                <th className="px-3 py-2 whitespace-nowrap">IFSC</th>
                <th className="px-3 py-2">Products</th>
                <th className="px-3 py-2 whitespace-nowrap text-right">Amount</th>
                <th className="px-3 py-2 whitespace-nowrap text-right">Settlement Amt</th>
                <th className="px-3 py-2 whitespace-nowrap">Settlement Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-3 py-6 text-center text-muted">
                    No transactions match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isOnline = r.transactionType === "razorpay";
                  return (
                    <tr key={r.orderId} className="border-b border-line last:border-b-0">
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{r.orderId}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.date ? new Date(r.date).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap capitalize">{r.transactionType}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.paymentStatus}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.orderStatus}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.societyName}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.sellerName}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.shopName}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.bankAccountNumber || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.ifscCode || "—"}</td>
                      <td className="px-3 py-2 max-w-xs truncate" title={r.productDetails}>
                        {r.productDetails}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        ₹{r.totalAmount.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        ₹{r.settlementAmount.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {isOnline ? (
                          <button
                            onClick={() => toggleSettled(r)}
                            disabled={statusBusyId === r.orderId}
                            className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-60 ${
                              r.settled ? "bg-green-bg text-green" : "bg-line text-ink/60"
                            }`}
                          >
                            {statusBusyId === r.orderId
                              ? "…"
                              : r.settled
                                ? "Paid"
                                : "Pending"}
                          </button>
                        ) : (
                          <span className="text-xs text-muted">COD — n/a</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <Reports />
    </RoleGuard>
  );
}
