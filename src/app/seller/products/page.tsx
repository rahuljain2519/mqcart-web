"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import {
  getShopBySeller,
  watchProductsByShopAll,
  createSellerProduct,
  updateProduct,
  deleteSellerProduct,
  validateProductLimit,
} from "@/lib/data";
import { uploadProductImages } from "@/lib/storage";
import type { Shop, Product } from "@/types";

// Mirrors the app's AddEditProductScreen category list.
const CATEGORIES = [
  "Groceries",
  "Bakery",
  "Snacks",
  "Personal Care",
  "Household",
  "Stationary",
  "Clothing",
  "Food",
  "Art & Decor",
  "Other",
];

type FormState = {
  id?: string;
  name: string;
  category: string;
  price: string;
  quantity: string;
  description: string;
  existingImages: string[];
  coverIndex: number;
};

const EMPTY: FormState = {
  name: "",
  category: "",
  price: "",
  quantity: "",
  description: "",
  existingImages: [],
  coverIndex: 0,
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
    let unsub = () => {};
    getShopBySeller(profile.uid).then((s) => {
      setShop(s);
      if (s) unsub = watchProductsByShopAll(s.shopId, setProducts);
    });
    return () => unsub();
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
      price: String(p.price),
      quantity: String(p.quantity),
      description: p.description,
      existingImages: p.images.length ? p.images : [p.coverImage].filter(Boolean),
      coverIndex: Math.max(
        0,
        (p.images.length ? p.images : [p.coverImage]).indexOf(p.coverImage)
      ),
    });
    setFiles([]);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !shop || !profile) return;
    setError(null);

    const price = parseFloat(form.price);
    const quantity = parseInt(form.quantity, 10);
    if (!form.name.trim() || !form.category) return setError("Name and category are required.");
    if (!Number.isFinite(price) || price < 0) return setError("Enter a valid price.");
    if (!Number.isFinite(quantity) || quantity < 0) return setError("Enter a valid quantity.");

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
        description: form.description.trim(),
        images,
        coverImage,
        isActive: true,
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
          <F label="Category">
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
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
              <div className="w-14 h-14 rounded-xl bg-green-bg shrink-0 overflow-hidden">
                {p.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.coverImage} alt="" className="w-full h-full object-cover" />
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
