"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { listSocieties } from "@/lib/data";
import type { Society } from "@/types";

export default function LoginPage() {
  const { signIn, signUp, firebaseUser } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [societies, setSocieties] = useState<Society[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [flatNumber, setFlatNumber] = useState("");

  useEffect(() => {
    if (firebaseUser) router.replace("/");
  }, [firebaseUser, router]);

  useEffect(() => {
    if (mode === "signup") {
      listSocieties().then(setSocieties).catch(() => setSocieties([]));
    }
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp({ email, password, name, phone, societyId, flatNumber });
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-3xl mb-1">
        {mode === "signin" ? "Welcome back" : "Join your society's marketplace"}
      </h1>
      <p className="text-muted text-sm mb-8">
        {mode === "signin"
          ? "Sign in to order or manage your shop."
          : "Create an account to start ordering from shops in your building."}
      </p>

      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" && (
          <>
            <Field label="Full name">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Phone number">
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Society">
              <select
                required
                value={societyId}
                onChange={(e) => setSocietyId(e.target.value)}
                className="input"
              >
                <option value="" disabled>
                  Select your society
                </option>
                {societies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.city}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Flat / block number">
              <input
                required
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                className="input"
              />
            </Field>
          </>
        )}

        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Password">
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </Field>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-accent text-white py-3 font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-6 text-sm text-muted hover:text-ink underline underline-offset-4"
      >
        {mode === "signin"
          ? "New here? Create a buyer account"
          : "Already have an account? Sign in"}
      </button>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 0.75rem;
          padding: 0.65rem 0.9rem;
          background: var(--surface);
          font-size: 0.95rem;
        }
        .input:focus {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
      `}</style>
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
