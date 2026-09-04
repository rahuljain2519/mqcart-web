"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import {
  getShopBySeller,
  listProductsByShop,
  addProduct,
  updateProduct,
} from "@/lib/data";
import type { Shop, Product } from "@/types";

function ProductsManager() {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    quantity: "",
    category: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!profile?.uid) return;
    const s = await getShopBySeller(profile.uid);
    setShop(s);
    if (s) setProducts(await listProductsByShop(s.shopId));
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !profile) return;
    setSaving(true);
    try {
      await addProduct({
        shopId: shop.shopId,
        sellerId: profile.uid,
        societyId: shop.societyId,
        name: form.name,
        price: Number(form.price),
        quantity: Number(form.quantity),
        category: form.category,
        description: form.description,
        images: [],
        coverImage: "",
        isActive: true,
      });
      setForm({ name: "", price: "", quantity: "", category: "", description: "" });
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: Product) => {
    await updateProduct(p.id, { isActive: !p.isActive });
    await load();
  };

  if (loading) return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Loading…</p>;
  if (!shop) return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">No shop found.</p>;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Products</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full bg-accent text-white px-5 py-2.5 font-medium hover:bg-accent/90 transition-colors"
        >
          {showForm ? "Cancel" : "Add product"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="border border-line rounded-2xl bg-surface p-5 mb-8 grid sm:grid-cols-2 gap-4"
        >
          <Field label="Name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-line rounded-xl px-3 py-2"
            />
          </Field>
          <Field label="Category">
            <input
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full border border-line rounded-xl px-3 py-2"
            />
          </Field>
          <Field label="Price (₹)">
            <input
              required
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full border border-line rounded-xl px-3 py-2"
            />
          </Field>
          <Field label="Stock quantity">
            <input
              required
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              className="w-full border border-line rounded-xl px-3 py-2"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-line rounded-xl px-3 py-2"
                rows={3}
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="sm:col-span-2 rounded-full bg-ink text-bg py-3 font-medium hover:bg-ink/85 transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save product"}
          </button>
        </form>
      )}

      {products.length === 0 ? (
        <p className="text-muted">No products listed yet.</p>
      ) : (
        <ul className="border border-line rounded-2xl bg-surface divide-y divide-line">
          {products.map((p) => (
            <li key={p.id} className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-bg shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{p.name}</p>
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
            </li>
          ))}
        </ul>
      )}
    </div>
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

export default function ProductsPage() {
  return (
    <RoleGuard allow={["seller"]}>
      <ProductsManager />
    </RoleGuard>
  );
}
