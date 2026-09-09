"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import {
  getShopBySeller,
  watchShopById,
  watchProductsByShopAll,
  createSellerProduct,
  updateProduct,
  deleteSellerProduct,
  validateProductLimit,
} from "@/lib/data";
import { uploadProductImages } from "@/lib/storage";
import { PRODUCT_CATEGORIES, subcategoriesFor } from "@/lib/categories";
import { UNIT_TYPES } from "@/lib/units";
import { OPTION_LABELS } from "@/lib/optionLabels";
import type { Shop, Product } from "@/types";

const CATEGORIES = PRODUCT_CATEGORIES;

type OptRow = { name: string; price: string; quantity: string };

type FormState = {
  id?: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  price: string;
  quantity: string;
  unitValue: string;
  unitType: string;
  mrp: string;
  description: string;
  existingImages: string[];
  coverIndex: number;
  // Variant options (weight / size / colour). Empty rows => simple product.
  optionLabel: string;
  customOptionLabel: boolean;
  options: OptRow[];
};

const EMPTY: FormState = {
  name: "",
  category: "",
  subcategory: "",
  brand: "",
  price: "",
  quantity: "",
  unitValue: "",
  unitType: "",
  mrp: "",
  description: "",
  existingImages: [],
  coverIndex: 0,
  optionLabel: "",
  customOptionLabel: false,
  options: [],
};

function ProductsManager() {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    let unsubShop = () => {};
    let unsubProducts = () => {};
    getShopBySeller(profile.uid).then((s) => {
      if (!s) {
        setShop(null);
        return;
      }
      // Live shop doc so productCount / productLimit in the header stay correct.
      unsubShop = watchShopById(s.shopId, setShop);
      unsubProducts = watchProductsByShopAll(s.shopId, setProducts);
    });
    return () => {
      unsubShop();
      unsubProducts();
    };
  }, [profile?.uid]);

  const activeCount = useMemo(
    () => products.filter((p) => p.isActive).length,
    [products]
  );

  const openAdd = async () => {
    setError(null);
    if (!shop) return;
    try {
      await validateProductLimit(shop.shopId);
      setForm({ ...EMPTY });
      setFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot add more products.");
    }
  };

  const openEdit = (p: Product) => {
    setError(null);
    setForm({
      id: p.id,
      name: p.name,
      category: p.category || "",
      // Fall back to unset if the stored subcategory doesn't match the
      // current list for this category (e.g. taxonomy changed since save).
      subcategory:
        p.subcategory && subcategoriesFor(p.category || "").includes(p.subcategory)
          ? p.subcategory
          : "",
      brand: p.brand ?? "",
      price: String(p.price),
      quantity: String(p.quantity),
      unitValue: p.unitValue != null ? String(p.unitValue) : "",
      unitType: p.unitType ?? "",
      mrp: p.mrp != null ? String(p.mrp) : "",
      description: p.description,
      existingImages: p.images.length ? p.images : [p.coverImage].filter(Boolean),
      coverIndex: Math.max(
        0,
        (p.images.length ? p.images : [p.coverImage]).indexOf(p.coverImage)
      ),
      optionLabel: p.optionLabel ?? "",
      customOptionLabel: !!p.optionLabel && !OPTION_LABELS.includes(p.optionLabel),
      options: (p.options ?? []).map((o) => ({
        name: o.name,
        price: String(o.price),
        quantity: String(o.quantity),
      })),
    });
    setFiles([]);
  };

  const setOpts = (options: OptRow[]) =>
    setForm((f) => (f ? { ...f, options } : f));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !shop || !profile) return;
    setError(null);

    if (!form.name.trim() || !form.category)
      return setError("Name and category are required.");

    const useOptions = form.options.length > 0;
    let price = parseFloat(form.price);
    let quantity = parseInt(form.quantity, 10);
    let options: { name: string; price: number; quantity: number }[] = [];

    if (useOptions) {
      const rows = form.options.map((o) => ({
        name: o.name.trim(),
        price: parseFloat(o.price),
        quantity: parseInt(o.quantity, 10),
      }));
      if (rows.some((o) => !o.name || !Number.isFinite(o.price) || o.price < 0 || !Number.isFinite(o.quantity) || o.quantity < 0)) {
        return setError("Every option needs a name, price and stock.");
      }
      if (new Set(rows.map((o) => o.name)).size !== rows.length) {
        return setError("Option names must be unique.");
      }
      options = rows;
      price = Math.min(...rows.map((o) => o.price)); // "from" price
      quantity = rows.reduce((s, o) => s + o.quantity, 0);
    } else {
      if (!Number.isFinite(price) || price < 0) return setError("Enter a valid price.");
      if (!Number.isFinite(quantity) || quantity < 0)
        return setError("Enter a valid quantity.");
    }

    // Brand applies regardless of variants; pack size + MRP only apply to
    // simple (non-variant) products.
    const brand = form.brand.trim() || undefined;
    let unitValue: number | undefined;
    let unitType: string | undefined;
    let mrp: number | undefined;
    if (!useOptions) {
      const uv = parseFloat(form.unitValue);
      unitValue = Number.isFinite(uv) ? uv : undefined;
      unitType = unitValue != null ? form.unitType || undefined : undefined;
      const m = parseFloat(form.mrp);
      mrp = Number.isFinite(m) ? m : undefined;
    }

    setSaving(true);
    try {
      const productId = form.id ?? `${Date.now()}`;

      let images = form.existingImages;
      if (files.length > 0) {
        images = await uploadProductImages(shop.shopId, productId, files.slice(0, 4));
      }
      const coverImage = images[Math.min(form.coverIndex, images.length - 1)] ?? "";

      const base = {
        shopId: shop.shopId,
        sellerId: profile.uid,
        societyId: shop.societyId,
        name: form.name.trim(),
        price,
        quantity,
        category: form.category,
        ...(form.subcategory ? { subcategory: form.subcategory } : {}),
        ...(brand ? { brand } : {}),
        ...(unitValue != null ? { unitValue } : {}),
        ...(unitType ? { unitType } : {}),
        ...(mrp != null ? { mrp } : {}),
        description: form.description.trim(),
        images,
        coverImage,
        isActive: true,
        optionLabel: useOptions ? form.optionLabel.trim() || "Option" : "",
        options,
      };

      if (form.id) {
        await updateProduct(form.id, base);
      } else {
        await createSellerProduct(base);
      }
      setForm(null);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the product.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Product) => {
    setError(null);
    if (!p.isActive && shop && activeCount >= shop.productLimit) {
      setError(`Product limit reached (${shop.productLimit}). Upgrade your plan.`);
      return;
    }
    await updateProduct(p.id, { isActive: !p.isActive });
  };

  const remove = async (p: Product) => {
    if (!shop) return;
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    await deleteSellerProduct(p.id, shop.shopId);
  };

  if (shop === undefined) {
    return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Loading…</p>;
  }
  if (!shop) {
    return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Create your shop first.</p>;
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl">Products</h1>
        {form === null && (
          <div className="flex gap-2">
            <Link
              href="/seller/products/bulk"
              className="rounded-full border border-line px-4 py-2.5 text-sm font-medium hover:border-ink/40"
            >
              Bulk upload
            </Link>
            <button
              onClick={openAdd}
              className="rounded-full bg-accent text-white px-5 py-2.5 font-medium hover:bg-accent/90 transition-colors"
            >
              Add product
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted mb-6">
        {shop.productCount} of {shop.productLimit} used · {activeCount} active
      </p>

      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {form && (
        <form
          onSubmit={save}
          className="border border-line rounded-2xl bg-surface p-5 mb-8 grid sm:grid-cols-2 gap-4"
        >
          <F label="Name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="in"
            />
          </F>
          <F label="Brand (optional)">
            <input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="in"
            />
          </F>
          <F label="Category">
            <select
              required
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value, subcategory: "" })
              }
              className="in"
            >
              <option value="" disabled>
                Select…
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </F>
          {form.category && (
            <F label="Subcategory (optional)">
              <select
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                className="in"
              >
                <option value="">Not specified</option>
                {subcategoriesFor(form.category).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </F>
          )}
          {form.options.length === 0 && (
            <>
              <F label="Price (₹)">
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="in"
                />
              </F>
              <F label="MRP (optional, for a strike-through price)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                  className="in"
                />
              </F>
              <F label="Stock quantity">
                <input
                  required
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="in"
                />
              </F>
              <F label="Pack size (optional)">
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="500"
                    value={form.unitValue}
                    onChange={(e) => setForm({ ...form, unitValue: e.target.value })}
                    className="in"
                  />
                  <select
                    value={form.unitType}
                    onChange={(e) => setForm({ ...form, unitType: e.target.value })}
                    className="in"
                  >
                    <option value="">Unit</option>
                    {UNIT_TYPES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </F>
            </>
          )}

          {/* Variant options — one listing, buyer picks size / weight / colour */}
          <div className="sm:col-span-2 border border-line rounded-xl p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.options.length > 0}
                onChange={(e) =>
                  setForm({
                    ...form,
                    options: e.target.checked
                      ? [{ name: "", price: form.price || "", quantity: form.quantity || "" }]
                      : [],
                  })
                }
              />
              This product comes in sizes / weights / colours
            </label>

            {form.options.length > 0 && (
              <>
                <F label="Option type">
                  <select
                    value={form.customOptionLabel ? "__custom__" : form.optionLabel}
                    onChange={(e) =>
                      e.target.value === "__custom__"
                        ? setForm({ ...form, customOptionLabel: true })
                        : setForm({ ...form, customOptionLabel: false, optionLabel: e.target.value })
                    }
                    className="in"
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {OPTION_LABELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                    <option value="__custom__">Custom…</option>
                  </select>
                </F>
                {form.customOptionLabel && (
                  <F label="Custom option type">
                    <input
                      value={form.optionLabel}
                      onChange={(e) => setForm({ ...form, optionLabel: e.target.value })}
                      className="in"
                    />
                  </F>
                )}

                <div className="space-y-2">
                  {form.options.map((o, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        value={o.name}
                        onChange={(e) =>
                          setOpts(form.options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                        }
                        placeholder="500g"
                        className="in flex-1"
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={o.price}
                        onChange={(e) =>
                          setOpts(form.options.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))
                        }
                        placeholder="₹"
                        className="in w-24"
                      />
                      <input
                        type="number"
                        min={0}
                        value={o.quantity}
                        onChange={(e) =>
                          setOpts(form.options.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))
                        }
                        placeholder="Stock"
                        className="in w-24"
                      />
                      <button
                        type="button"
                        onClick={() => setOpts(form.options.filter((_, j) => j !== i))}
                        className="text-muted hover:text-danger px-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOpts([...form.options, { name: "", price: "", quantity: "" }])}
                  className="text-sm text-accent-ink"
                >
                  + Add option
                </button>
              </>
            )}
          </div>

          <div className="sm:col-span-2">
            <F label="Description">
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="in"
              />
            </F>
          </div>

          <div className="sm:col-span-2">
            <F label="Images (up to 4 — first is the cover unless you pick another)">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 4))}
                className="text-sm"
              />
            </F>
            {(files.length > 0 || form.existingImages.length > 0) && (
              <div className="flex gap-2 mt-2">
                {(files.length > 0
                  ? files.map((f) => URL.createObjectURL(f))
                  : form.existingImages
                ).map((src, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setForm({ ...form, coverIndex: i })}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      form.coverIndex === i ? "border-accent" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sm:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-ink text-bg px-6 py-2.5 font-medium hover:bg-ink/85 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save product"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-full border border-line px-6 py-2.5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {products.length === 0 ? (
        <p className="text-muted">No products yet.</p>
      ) : (
        <ul className="border border-line rounded-2xl bg-surface divide-y divide-line">
          {products.map((p) => (
            <li key={p.id} className="p-4 flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-xl bg-green-bg shrink-0 overflow-hidden">
                {p.coverImage ? (
                  <Image src={p.coverImage} alt="" fill sizes="56px" className="object-cover" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-sm text-muted">
                  ₹{p.price.toFixed(0)} · Stock {p.quantity} · {p.category}
                </p>
              </div>
              <button
                onClick={() => toggleActive(p)}
                className={`text-xs rounded-full px-3 py-1 ${
                  p.isActive ? "bg-green-bg text-green" : "bg-line text-ink/60"
                }`}
              >
                {p.isActive ? "Active" : "Hidden"}
              </button>
              <button
                onClick={() => openEdit(p)}
                className="text-sm text-ink/70 hover:text-ink"
              >
                Edit
              </button>
              <button
                onClick={() => remove(p)}
                className="text-sm text-muted hover:text-danger"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <style jsx global>{`
        .in {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 0.75rem;
          padding: 0.55rem 0.85rem;
          background: var(--bg);
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-ink/70 mb-1">{label}</span>
      {children}
    </label>
  );
}

export default function ProductsPage() {
  return (
    <RoleGuard allow={["seller"]}>
      <ProductsManager />
    </RoleGuard>
  );
}
