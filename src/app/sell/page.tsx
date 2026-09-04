"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { submitSellerApplication, saveSellerDocumentUrl } from "@/lib/data";
import { uploadSellerDocument } from "@/lib/storage";
import { SHOP_CATEGORIES } from "@/lib/categories";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const BUSINESS_TYPES = [
  "Individual",
  "Proprietorship",
  "Partnership",
  "Private Limited",
  "LLP",
];

// Individual & proprietorship trade on personal ID (PAN + Aadhaar).
// Everything else is a registered entity — GSTIN + registration number instead.
const isPersonalId = (t: string) => t === "Individual" || t === "Proprietorship";

export default function SellPage() {
  const { profile, firebaseUser, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    shopName: "",
    category: "",
    businessType: "Individual",
    panNumber: "",
    aadhaar: "",
    gstin: "",
    registrationNumber: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    bankAccountNumber: "",
    ifscCode: "",
    bankName: "",
  });
  const [docs, setDocs] = useState<{
    pan: File | null;
    aadhaar: File | null;
    registration: File | null;
  }>({ pan: null, aadhaar: null, registration: null });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!firebaseUser || !profile) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl mb-2">Sell in your society</h1>
        <p className="text-muted mb-6">Sign in first to apply as a seller.</p>
        <Link href="/login" className="rounded-full bg-accent text-white px-6 py-3 font-medium">
          Sign in
        </Link>
      </div>
    );
  }

  if (profile.sellerStatus === "pending" || submitted) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl mb-2">Application received</h1>
        <p className="text-muted">An admin will review your seller application shortly.</p>
      </div>
    );
  }

  if (profile.sellerStatus === "approved" || profile.sellerStatus === "active") {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl mb-2">You&rsquo;re a seller</h1>
        <Link href="/seller" className="underline underline-offset-4">
          Go to your seller dashboard
        </Link>
      </div>
    );
  }

  const personal = isPersonalId(form.businessType);

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (form.panNumber.trim().length !== 10) {
        throw new Error("Enter a valid 10-character PAN.");
      }
      if (personal) {
        if (!/^\d{12}$/.test(form.aadhaar)) {
          throw new Error("Aadhaar must be 12 digits.");
        }
      } else {
        if (form.gstin.trim().length < 15) {
          throw new Error("GSTIN is required for a registered business.");
        }
      }

      await submitSellerApplication({
        uid: profile.uid,
        shopName: form.shopName.trim(),
        category: form.category,
        description: "",
        businessType: form.businessType,
        panNumber: form.panNumber.trim().toUpperCase(),
        aadhaarLast4: personal ? form.aadhaar.slice(-4) : "",
        gstin: form.gstin.trim() || undefined,
        registrationNumber: personal
          ? undefined
          : form.registrationNumber.trim() || undefined,
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        bankAccountNumber: form.bankAccountNumber.trim() || undefined,
        ifscCode: form.ifscCode.trim().toUpperCase() || undefined,
        bankName: form.bankName.trim() || undefined,
      });

      // KYC documents (optional) — same Storage path + subcollection as the app.
      if (profile.societyId) {
        const uploads: [("pan" | "aadhaar" | "gst"), File | null][] = [
          ["pan", docs.pan],
          ["aadhaar", personal ? docs.aadhaar : null],
          ["gst", !personal ? docs.registration : null],
        ];
        for (const [t, f] of uploads) {
          if (!f) continue;
          const url = await uploadSellerDocument(profile.societyId, profile.uid, t, f);
          await saveSellerDocumentUrl(profile.societyId, profile.uid, t, url);
        }
      }

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
        An admin reviews every application before your shop goes live.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <Text label="Shop name" value={form.shopName} onChange={set("shopName")} required />
        <Select
          label="What do you sell?"
          value={form.category}
          onChange={set("category")}
          options={[...SHOP_CATEGORIES]}
          required
        />
        <Select
          label="Business type"
          value={form.businessType}
          onChange={set("businessType")}
          options={BUSINESS_TYPES}
          required
        />

        <div className="border-t border-line pt-4 space-y-4">
          <Text
            label={personal ? "PAN" : "Business PAN"}
            value={form.panNumber}
            onChange={set("panNumber")}
            required
            maxLength={10}
          />

          {personal ? (
            <Text
              label="Aadhaar (12 digits)"
              value={form.aadhaar}
              onChange={set("aadhaar")}
              required
              maxLength={12}
            />
          ) : (
            <>
              <Text label="GSTIN" value={form.gstin} onChange={set("gstin")} required maxLength={15} />
              <Text
                label="Registration / CIN number (optional)"
                value={form.registrationNumber}
                onChange={set("registrationNumber")}
              />
            </>
          )}

          {personal && (
            <Text label="GSTIN (optional)" value={form.gstin} onChange={set("gstin")} maxLength={15} />
          )}
        </div>

        <div className="border-t border-line pt-4 space-y-3">
          <p className="text-sm text-muted">Documents (image or PDF — optional)</p>
          <DocInput label="PAN card" onChange={(f) => setDocs((d) => ({ ...d, pan: f }))} />
          {personal ? (
            <DocInput
              label="Aadhaar card"
              onChange={(f) => setDocs((d) => ({ ...d, aadhaar: f }))}
            />
          ) : (
            <DocInput
              label="GST / incorporation certificate"
              onChange={(f) => setDocs((d) => ({ ...d, registration: f }))}
            />
          )}
        </div>

        <div className="border-t border-line pt-4">
          <Text label="Address" value={form.addressLine} onChange={set("addressLine")} required />
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Text label="City" value={form.city} onChange={set("city")} required />
            <Text label="State" value={form.state} onChange={set("state")} required />
            <Text label="Pincode" value={form.pincode} onChange={set("pincode")} required maxLength={6} />
          </div>
        </div>

        <div className="border-t border-line pt-4 space-y-4">
          <p className="text-sm text-muted">Bank details (optional)</p>
          <Text label="Account number" value={form.bankAccountNumber} onChange={set("bankAccountNumber")} />
          <div className="grid grid-cols-2 gap-3">
            <Text label="IFSC" value={form.ifscCode} onChange={set("ifscCode")} />
            <Text label="Account holder name" value={form.bankName} onChange={set("bankName")} />
          </div>
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

function Text({
  label,
  value,
  onChange,
  required,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-ink/70 mb-1">{label}</span>
      <input
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        className="w-full border border-line rounded-xl px-3 py-2 bg-surface"
      />
    </label>
  );
}

function DocInput({
  label,
  onChange,
}: {
  label: string;
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ink/70">{label}</span>
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="text-sm max-w-[60%]"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-ink/70 mb-1">{label}</span>
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full border border-line rounded-xl px-3 py-2 bg-surface"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
