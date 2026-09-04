"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { submitSellerApplication } from "@/lib/data";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SellPage() {
  const { profile, firebaseUser, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    shopName: "",
    category: "",
    description: "",
    businessType: "individual",
    panNumber: "",
    aadhaarLast4: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!firebaseUser || !profile) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl mb-2">Sell in your society</h1>
        <p className="text-muted mb-6">Sign in first to apply as a seller.</p>
        <Link
          href="/login"
          className="rounded-full bg-accent text-white px-6 py-3 font-medium"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (profile.sellerStatus === "pending" || submitted) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl mb-2">Application received</h1>
        <p className="text-muted">
          An admin will review your seller application shortly.
        </p>
      </div>
    );
  }

  if (profile.sellerStatus === "active") {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl mb-2">You&rsquo;re already selling</h1>
        <Link href="/seller" className="underline underline-offset-4">
          Go to your seller dashboard
        </Link>
      </div>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await submitSellerApplication({ uid: profile.uid, ...form });
      await updateDoc(doc(db, "users", profile.uid), { sellerStatus: "pending" });
      await refreshProfile();
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <h1 className="font-display text-3xl mb-1">Sell in your society</h1>
      <p className="text-muted mb-8">
        Tell us about your shop. An admin reviews every application before it
        goes live.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Row label="Shop name" value={form.shopName} onChange={set("shopName")} />
        <Row label="Category" value={form.category} onChange={set("category")} />
        <Row label="Description" value={form.description} onChange={set("description")} />
        <Row label="PAN number" value={form.panNumber} onChange={set("panNumber")} />
        <Row
          label="Aadhaar (last 4 digits)"
          value={form.aadhaarLast4}
          onChange={set("aadhaarLast4")}
          maxLength={4}
        />
        <Row label="Address" value={form.addressLine} onChange={set("addressLine")} />
        <div className="grid grid-cols-3 gap-3">
          <Row label="City" value={form.city} onChange={set("city")} />
          <Row label="State" value={form.state} onChange={set("state")} />
          <Row label="Pincode" value={form.pincode} onChange={set("pincode")} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-accent text-white py-3 font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}

function Row({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-ink/70 mb-1">{label}</span>
      <input
        required
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="w-full border border-line rounded-xl px-3 py-2"
      />
    </label>
  );
}
