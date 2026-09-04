"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { listSocieties, watchProductsBySociety } from "@/lib/data";
import { CATEGORIES, matchesCategory } from "@/lib/categories";
import ProductCard from "@/components/ProductCard";
import CartBar from "@/components/CartBar";
import type { Product, Society } from "@/types";

export default function HomePage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (profile?.role === "seller") router.replace("/seller");
    if (profile?.role === "admin") router.replace("/admin");
  }, [profile, router]);

  if (loading) {
    return <p className="mx-auto max-w-6xl px-5 py-24 text-center text-muted">Loading…</p>;
  }

  if (!firebaseUser) return <GuestLanding />;
  if (profile && profile.role === "buyer" && !profile.societyId) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl mb-2">Almost there</h1>
        <p className="text-muted mb-6">
          Add your society and flat number so we can show the shops near you.
        </p>
        <Link href="/login" className="rounded-full bg-accent text-white px-6 py-3 font-medium">
          Complete profile
        </Link>
      </div>
    );
  }
  if (profile?.role === "buyer") return <Feed societyId={profile.societyId} />;

  return <p className="mx-auto max-w-6xl px-5 py-24 text-center text-muted">Loading…</p>;
}

function Feed({ societyId }: { societyId: string }) {
  const { singleShopId } = useCart();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = watchProductsBySociety(societyId, setProducts);
    return () => unsub();
  }, [societyId]);

  const shown = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase().trim();
    return products.filter(
      (p) =>
        (q === "" || p.name.toLowerCase().includes(q)) &&
        matchesCategory(p.category, category)
    );
  }, [products, search, category]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-6xl px-5 pt-6 flex-1">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for milk, bread, fruits…"
          className="w-full border border-line rounded-full px-5 py-3 bg-surface"
        />

        <div className="flex gap-2 overflow-x-auto py-4 -mx-5 px-5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm border transition-colors ${
                category === c
                  ? "border-accent bg-accent/10 text-accent-ink"
                  : "border-line hover:border-ink/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {notice && <p className="text-sm text-danger mb-3">{notice}</p>}
        {singleShopId && (
          <p className="text-xs text-muted mb-3">
            Your cart has items from one shop — clear it to order from another.
          </p>
        )}

        {products === null ? (
          <p className="text-muted py-10">Loading products…</p>
        ) : shown.length === 0 ? (
          <p className="text-muted py-10">No products found.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {shown.map((p) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  onMultiShop={() =>
                    setNotice("You can order from only one shop at a time.")
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <CartBar />
    </div>
  );
}

function GuestLanding() {
  const [societies, setSocieties] = useState<Society[]>([]);
  useEffect(() => {
    listSocieties().then(setSocieties).catch(() => setSocieties([]));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 grid md:grid-cols-2 gap-14 items-center">
      <div>
        <h1 className="font-display text-[3.2rem] leading-[1.05] max-w-lg">
          The shops downstairs, now a tap away.
        </h1>
        <p className="mt-5 text-lg text-ink/70 max-w-md">
          mqcart connects you to the sellers already inside your residential
          society — groceries, essentials and more, delivered from your own
          building.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full bg-accent text-white px-6 py-3 font-medium hover:bg-accent/90 transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/sell"
            className="rounded-full border border-ink/20 px-6 py-3 font-medium hover:border-ink/40 transition-colors"
          >
            Sell in your society
          </Link>
        </div>
      </div>

      <div className="border border-line rounded-2xl bg-surface overflow-hidden">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <span className="text-sm font-medium">Societies on mqcart</span>
          <span className="text-xs text-muted">{societies.length} listed</span>
        </div>
        <ul>
          {(societies.length
            ? societies
            : [{ id: "p1", name: "Add your society", city: "Coming soon", isActive: true }]
          )
            .slice(0, 6)
            .map((s, i) => (
              <li
                key={s.id ?? i}
                className="px-5 py-4 border-b border-line last:border-b-0 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted">{s.city}</p>
                </div>
                <span className="text-xs rounded-full bg-green-bg text-green px-3 py-1">
                  Active
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
