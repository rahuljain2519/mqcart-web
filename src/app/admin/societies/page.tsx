"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { listAllSocieties, createSociety, deleteSociety } from "@/lib/data";
import type { Society } from "@/types";

function Societies() {
  const [societies, setSocieties] = useState<Society[] | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => listAllSocieties().then(setSocieties);
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createSociety(name, city);
      setName("");
      setCity("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the society.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: Society) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    await deleteSociety(s.id);
    await load();
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Societies</h1>

      <form onSubmit={add} className="flex flex-wrap gap-3 mb-8">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Society name"
          className="flex-1 min-w-[10rem] border border-line rounded-xl px-3 py-2 bg-surface"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="w-40 border border-line rounded-xl px-3 py-2 bg-surface"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-accent text-white px-5 py-2 font-medium disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="text-sm text-danger mb-4">{error}</p>}

      {societies === null ? (
        <p className="text-muted">Loading…</p>
      ) : societies.length === 0 ? (
        <p className="text-muted">No societies yet.</p>
      ) : (
        <ul className="border border-line rounded-2xl bg-surface divide-y divide-line">
          {societies.map((s) => (
            <li key={s.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted">
                  {s.city} {s.isActive ? "" : "· inactive"}
                </p>
              </div>
              <button
                onClick={() => remove(s)}
                className="text-sm text-muted hover:text-danger"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminSocietiesPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <Societies />
    </RoleGuard>
  );
}
