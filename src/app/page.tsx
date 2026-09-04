"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { listSocieties } from "@/lib/data";
import type { Society } from "@/types";

export default function HomePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [societies, setSocieties] = useState<Society[]>([]);

  useEffect(() => {
    listSocieties().then(setSocieties).catch(() => setSocieties([]));
  }, []);

  useEffect(() => {
    if (profile?.role === "seller") router.replace("/seller");
    if (profile?.role === "admin") router.replace("/admin");
  }, [profile, router]);

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-20 grid md:grid-cols-2 gap-14 items-center">
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
              href={profile ? "/shops" : "/login"}
              className="rounded-full bg-accent text-white px-6 py-3 font-medium hover:bg-accent/90 transition-colors"
            >
              {profile ? "Browse shops" : "Get started"}
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
            <span className="text-sm font-medium">Societies live on mqcart</span>
            <span className="text-xs text-muted">{societies.length} listed</span>
          </div>
          <ul>
            {(societies.length ? societies : placeholderSocieties).slice(0, 6).map((s, i) => (
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
      </section>

      {/* How it works */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 grid md:grid-cols-3 gap-10">
          <Step
            title="Find your society"
            body="Sign up with your society and flat number so orders reach the right door."
          />
          <Step
            title="Order from next door"
            body="Browse the shops and products listed inside your own society and add to cart."
          />
          <Step
            title="Pay and track"
            body="Choose cash on delivery or pay online, then track your order until it arrives."
          />
        </div>
      </section>
    </div>
  );
}

function Step({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-display text-xl mb-2">{title}</h3>
      <p className="text-ink/70 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

const placeholderSocieties: Society[] = [
  { id: "p1", name: "Add your society", city: "Coming soon", isActive: true },
];
