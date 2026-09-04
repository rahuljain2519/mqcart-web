"use client";

import { useState } from "react";
import {
  createShop,
  updateShop,
  linkShopToUser,
  toMinutes,
} from "@/lib/data";
import { uploadShopImage } from "@/lib/storage";
import type { DeliveryUnit, Shop } from "@/types";

const UNITS: DeliveryUnit[] = ["minutes", "hours", "days"];

export default function ShopForm({
  mode,
  shop,
  sellerId,
  societyId,
  uid,
  onDone,
}: {
  mode: "create" | "edit";
  shop?: Shop;
  sellerId: string;
  societyId: string;
  uid: string;
  onDone: (shopId: string) => void;
}) {
  const [shopName, setShopName] = useState(shop?.shopName ?? "");
  const [description, setDescription] = useState(shop?.description ?? "");
  const [unit, setUnit] = useState<DeliveryUnit>(shop?.deliveryUnit ?? "days");
  const [minV, setMinV] = useState(String(shop?.deliveryMinValue ?? 2));
  const [maxV, setMaxV] = useState(String(shop?.deliveryMaxValue ?? 3));
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const min = parseInt(minV, 10);
    const max = parseInt(maxV, 10);
    if (!shopName.trim()) return setError("Shop name is required.");
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) {
      return setError("Enter a valid delivery time range.");
    }

    setBusy(true);
    try {
      let shopId = shop?.shopId ?? "";

      if (mode === "create") {
        shopId = await createShop({
          sellerId,
          societyId,
          shopName,
          deliveryUnit: unit,
          deliveryMinValue: min,
          deliveryMaxValue: max,
        });
      }

      const logoUrl = logo ? await uploadShopImage(shopId, logo, "logo") : undefined;
      const bannerUrl = banner
        ? await uploadShopImage(shopId, banner, "banner")
        : undefined;

      await updateShop(shopId, {
        shopName: shopName.trim(),
        description: description.trim(),
        deliveryUnit: unit,
        deliveryMinValue: min,
        deliveryMaxValue: max,
        deliveryMinMinutes: toMinutes(min, unit),
        deliveryMaxMinutes: toMinutes(max, unit),
        ...(logoUrl ? { logoUrl } : {}),
        ...(bannerUrl ? { bannerUrl } : {}),
      });

      if (mode === "create") await linkShopToUser(uid, shopId);

      onDone(shopId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 max-w-lg">
      <Field label="Shop name">
        <input
          required
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          className="fld"
        />
      </Field>

      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="fld"
        />
      </Field>

      <Field label="Delivery time">
        <div className="flex gap-3">
          <input
            type="number"
            min={1}
            value={minV}
            onChange={(e) => setMinV(e.target.value)}
            className="fld w-24"
            aria-label="Minimum"
          />
          <span className="self-center text-muted">to</span>
          <input
            type="number"
            min={1}
            value={maxV}
            onChange={(e) => setMaxV(e.target.value)}
            className="fld w-24"
            aria-label="Maximum"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as DeliveryUnit)}
            className="fld flex-1"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <Field label={`Logo ${shop?.logoUrl ? "(replace)" : ""}`}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </Field>
      <Field label={`Banner ${shop?.bannerUrl ? "(replace)" : ""}`}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setBanner(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-accent text-white px-6 py-3 font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
      >
        {busy
          ? "Saving…"
          : mode === "create"
            ? "Create shop"
            : "Save changes"}
      </button>

      <style jsx global>{`
        .fld {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 0.75rem;
          padding: 0.6rem 0.9rem;
          background: var(--surface);
          font-size: 0.95rem;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-ink/70 mb-1">{label}</span>
      {children}
    </label>
  );
}
