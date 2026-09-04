"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { getSociety, listSocieties } from "@/lib/data";
import type { Society } from "@/types";

function ProfileView() {
  const { profile, updateProfile, signOut } = useAuth();
  const router = useRouter();

  const [societyName, setSocietyName] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [name, setName] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.societyId) getSociety(profile.societyId).then((s) => setSocietyName(s?.name ?? ""));
  }, [profile?.societyId]);

  const startEdit = () => {
    if (!profile) return;
    setName(profile.name);
    setSocietyId(profile.societyId);
    setFlatNumber(profile.flatNumber);
    setError(null);
    setEditing(true);
    listSocieties().then(setSocieties).catch(() => setSocieties([]));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ name, societyId, flatNumber });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-lg px-5 py-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-accent text-white grid place-items-center text-2xl font-display">
          {profile.name ? profile.name[0].toUpperCase() : "?"}
        </div>
        <div>
          <h1 className="font-display text-2xl">{profile.name || "Your profile"}</h1>
          <span className="text-xs rounded-full bg-line px-2.5 py-0.5 uppercase tracking-wide">
            {profile.role}
          </span>
        </div>
      </div>

      {!editing ? (
        <>
          <div className="border border-line rounded-2xl bg-surface divide-y divide-line">
            <Tile label="Phone" value={profile.phone || "—"} />
            <Tile label="Society" value={societyName || "Not set"} />
            <Tile label="Flat / block" value={profile.flatNumber || "—"} />
          </div>

          <button
            onClick={startEdit}
            className="mt-5 rounded-full bg-accent text-white px-6 py-2.5 font-medium hover:bg-accent/90 transition-colors"
          >
            Edit profile
          </button>

          <SellerSection status={profile.sellerStatus} />

          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="mt-10 block text-danger font-medium"
          >
            Log out
          </button>
        </>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <label className="block">
            <span className="block text-sm text-ink/70 mb-1">Full name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-line rounded-xl px-3 py-2 bg-surface"
            />
          </label>
          <label className="block">
            <span className="block text-sm text-ink/70 mb-1">Society</span>
            <select
              required
              value={societyId}
              onChange={(e) => setSocietyId(e.target.value)}
              className="w-full border border-line rounded-xl px-3 py-2 bg-surface"
            >
              <option value="" disabled>
                Select…
              </option>
              {societies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.city}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-sm text-ink/70 mb-1">Flat / block number</span>
            <input
              required
              value={flatNumber}
              onChange={(e) => setFlatNumber(e.target.value)}
              className="w-full border border-line rounded-xl px-3 py-2 bg-surface"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy || !societyId}
              className="rounded-full bg-accent text-white px-6 py-2.5 font-medium disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-line px-6 py-2.5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  );
}

function SellerSection({ status }: { status: string }) {
  if (status === "approved" || status === "active") {
    return (
      <Link
        href="/seller"
        className="mt-4 block rounded-2xl border border-line bg-surface p-4 hover:border-ink/30"
      >
        <p className="font-medium">Seller dashboard →</p>
        <p className="text-sm text-muted">Manage your shop, products and orders.</p>
      </Link>
    );
  }
  if (status === "pending") {
    return (
      <div className="mt-4 rounded-2xl bg-accent/10 text-accent-ink p-4 text-sm">
        Your seller application is under review.
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <Link
        href="/sell"
        className="mt-4 block rounded-2xl border border-line bg-surface p-4 hover:border-ink/30"
      >
        <p className="font-medium text-danger">Application rejected</p>
        <p className="text-sm text-muted">Re-apply as a seller →</p>
      </Link>
    );
  }
  return (
    <Link
      href="/sell"
      className="mt-4 block rounded-2xl border border-line bg-surface p-4 hover:border-ink/30"
    >
      <p className="font-medium">Become a seller →</p>
      <p className="text-sm text-muted">Sell to your society from your own shop.</p>
    </Link>
  );
}

export default function ProfilePage() {
  return (
    <RoleGuard allow={["buyer", "seller", "admin"]}>
      <ProfileView />
    </RoleGuard>
  );
}
