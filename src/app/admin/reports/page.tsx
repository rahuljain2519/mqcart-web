"use client";

import { useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { buildTransactionsReport, transactionsReportToCsv } from "@/lib/data";

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

function Reports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCount, setLastCount] = useState<number | null>(null);

  const exportReport = async () => {
    setBusy(true);
    setError(null);
    try {
      const rows = await buildTransactionsReport({
        startDate: startDate ? new Date(startDate) : undefined,
        // Include the whole end day, not just midnight.
        endDate: endDate ? new Date(endDate + "T23:59:59.999") : undefined,
      });
      setLastCount(rows.length);
      const csv = transactionsReportToCsv(rows);
      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(`mqcart-transactions-${today}.csv`, csv);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl mb-2">Transaction report</h1>
      <p className="text-muted mb-8">
        Exports every order (COD and online) as a CSV — transaction type, seller name, shop
        name, bank account &amp; IFSC, society, order ID, product details, and date. Useful for
        offline reconciliation and paying sellers via the Settlements page.
      </p>

      <div className="border border-line rounded-2xl bg-surface p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-ink/60">From (optional)</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mt-1 bg-bg"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink/60">To (optional)</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 mt-1 bg-bg"
            />
          </label>
        </div>
        <p className="text-xs text-muted">Leave both blank to export every order ever placed.</p>

        {error && <p className="text-sm text-danger">{error}</p>}
        {lastCount !== null && !error && (
          <p className="text-sm text-green">Exported {lastCount} transactions.</p>
        )}

        <button
          onClick={exportReport}
          disabled={busy}
          className="rounded-full bg-ink text-bg px-6 py-2.5 font-medium disabled:opacity-60"
        >
          {busy ? "Building…" : "Export CSV"}
        </button>
      </div>
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
