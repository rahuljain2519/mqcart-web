"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import {
  listUsersByRole,
  listAllSocieties,
  getShopBySeller,
  toggleShopActive,
  adminUpdateUser,
} from "@/lib/data";
import type { AppUser, Shop, Society } from "@/types";

function SellerRow({
  user,
  societies,
  onChanged,
}: {
  user: AppUser;
  societies: Society[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [role, setRole] = useState(user.role);
  const [societyId, setSocietyId] = useState(user.societyId);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && shop === undefined) getShopBySeller(user.uid).then(setShop);
  }, [open, shop, user.uid]);

  const toggle = async () => {
    if (!shop) return;
    setBusy(true);
    try {
      await toggleShopActive(shop.shopId, !shop.isActive);
      setShop({ ...shop, isActive: !shop.isActive });
    } finally {
      setBusy(false);
    }
  };

  const saveUser = async () => {
    setBusy(true);
    try {
      await adminUpdateUser(user.uid, { role, societyId });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <span>
          <span className="font-medium">{user.name || "(no name)"}</span>{" "}
          <span className="text-sm text-muted">· {user.phone}</span>
        </span>
        <span className="text-xs text-muted">{user.sellerStatus}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4 text-sm">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-ink/60">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AppUser["role"])}
                className="w-full border border-line rounded-lg px-2 py-1.5 mt-1 bg-surface"
              >
                <option value="buyer">buyer</option>
                <option value="seller">seller</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label className="block">
              <span className="text-ink/60">Society</span>
              <select
                value={societyId}
                onChange={(e) => setSocietyId(e.target.value)}
                className="w-full border border-line rounded-lg px-2 py-1.5 mt-1 bg-surface"
              >
                <option value="">—</option>
                {societies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            onClick={saveUser}
            disabled={busy}
            className="rounded-full bg-ink text-bg px-4 py-1.5 disabled:opacity-60"
          >
            Save user
          </button>

          <div className="border-t border-line pt-4">
            <p className="text-ink/60 mb-1">Shop</p>
            {shop === undefined ? (
              <p className="text-muted">Loading…</p>
            ) : !shop ? (
              <p className="text-muted">No shop created yet.</p>
            ) : (
              <div className="space-y-1">
                <p className="font-medium">{shop.shopName}</p>
                <p className="text-muted">
                  {shop.isActive ? "Active" : "Inactive"} · Plan {shop.plan} ·{" "}
                  {shop.productCount}/{shop.productLimit} products
                </p>
                <button
                  onClick={toggle}
                  disabled={busy}
                  className="mt-2 rounded-full border border-line px-4 py-1.5 hover:border-ink/40 disabled:opacity-60"
                >
                  {shop.isActive ? "Deactivate shop" : "Activate shop"} (cascades to products)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Sellers() {
  const [sellers, setSellers] = useState<AppUser[] | null>(null);
  const [societies, setSocieties] = useState<Society[]>([]);

  const load = () => listUsersByRole("seller").then(setSellers);
  useEffect(() => {
    load();
    listAllSocieties().then(setSocieties);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Sellers</h1>
      {sellers === null ? (
        <p className="text-muted">Loading…</p>
      ) : sellers.length === 0 ? (
        <p className="text-muted">No sellers yet.</p>
      ) : (
        <ul className="border border-line rounded-2xl bg-surface divide-y divide-line">
          {sellers.map((u) => (
            <SellerRow key={u.uid} user={u} societies={societies} onChanged={load} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <Sellers />
    </RoleGuard>
  );
}
