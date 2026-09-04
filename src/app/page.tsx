"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { listSocieties, watchProductsBySociety } from "@/lib/data";
import { CATEGORIES, CATEGORY_EMOJI, matchesCategory } from "@/lib/categories";
import ProductCard from "@/components/ProductCard";
import CartBar from "@/components/CartBar";
import AddressBar from "@/components/AddressBar";
import { ProductGridSkeleton } from "@/components/Skeleton";
import { MicIcon, SearchIcon } from "@/components/icons";
import type { Product, Society } from "@/types";

export default function HomePage() {
  const { firebaseUser, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (profile?.role === "seller") router.replace("/seller");
    if (profile?.role === "admin") router.replace("/admin");
  }, [profile, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10">
        <ProductGridSkeleton />
      </div>
    );
  }

  if (!firebaseUser) return <GuestLanding />;

  if (profile && profile.role === "buyer" && !profile.societyId) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <div className="text-5xl mb-3">📍</div>
        <h1 className="font-display text-2xl mb-2">Almost there</h1>
        <p className="text-muted mb-6">
          Add your society and flat number so we can show the shops near you.
        </p>
        <Link
          href="/profile"
          className="rounded-full bg-accent text-white px-6 py-3 font-medium"
        >
          Add delivery address
        </Link>
      </div>
    );
  }

  if (profile?.role === "buyer") return <Feed societyId={profile.societyId} />;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <ProductGridSkeleton />
    </div>
  );
}

const SEARCH_HINTS = [
  "Search “milk”",
  "Search “bread”",
  "Search “fresh fruit”",
  "Search “cake”",
  "Search “chips”",
];

function Feed({ societyId }: { societyId: string }) {
  const { singleShopId } = useCart();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [notice, setNotice] = useState<string | null>(null);
  const [hint, setHint] = useState(0);
  const recognitionRef = useRef<{ start: () => void } | null>(null);
  const [micAvailable, setMicAvailable] = useState(false);

  useEffect(() => {
    const unsub = watchProductsBySociety(societyId, setProducts);
    return () => unsub();
  }, [societyId]);

  // Rotate the placeholder hint while the field is empty (like the app).
  useEffect(() => {
    if (search) return;
    const t = setInterval(() => setHint((h) => (h + 1) % SEARCH_HINTS.length), 2600);
    return () => clearInterval(t);
  }, [search]);

  // Optional voice search — progressive enhancement only.
  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => never;
      webkitSpeechRecognition?: new () => never;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new (Ctor as unknown as new () => {
      lang: string;
      interimResults: boolean;
      onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void;
      start: () => void;
    })();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.onresult = (e) => setSearch(e.results[0][0].transcript);
    recognitionRef.current = rec;
    // one-time capability detection
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMicAvailable(true);
  }, []);

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
      <div className="sticky top-16 z-20 bg-bg/95 backdrop-blur border-b border-line/70">
        <div className="mx-auto w-full max-w-6xl px-5 pt-3 pb-2 flex items-center justify-between">
          <AddressBar />
        </div>
        <div className="mx-auto w-full max-w-6xl px-5 pb-3">
          <div className="relative">
            <SearchIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={search ? "" : SEARCH_HINTS[hint]}
              className="w-full border border-line rounded-full pl-11 pr-11 py-3 bg-surface"
            />
            {micAvailable && (
              <button
                type="button"
                onClick={() => recognitionRef.current?.start()}
                aria-label="Voice search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-accent-ink"
              >
                <MicIcon />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pt-3 -mx-5 px-5 no-scrollbar">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full pl-2 pr-3 py-1.5 text-sm border transition-colors flex items-center gap-1 ${
                  category === c
                    ? "border-accent bg-accent/10 text-accent-ink"
                    : "border-line hover:border-ink/30"
                }`}
              >
                <span aria-hidden>{CATEGORY_EMOJI[c]}</span>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 pt-4 flex-1">
        {notice && <p className="text-sm text-danger mb-3">{notice}</p>}
        {singleShopId && (
          <p className="text-xs text-muted mb-3">
            Your cart has items from one shop — clear it to order from another.
          </p>
        )}

        {products === null ? (
          <ProductGridSkeleton />
        ) : shown.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-2">🧺</div>
            <p className="font-medium">Nothing here yet</p>
            <p className="text-sm text-muted">
              {search || category !== "All"
                ? "Try a different search or category."
                : "No shops in your society have listed products yet."}
            </p>
          </div>
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
