"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { listSocieties } from "@/lib/data";
import type { Society } from "@/types";

type Step = "phone" | "otp" | "profile";

export default function LoginPage() {
  const { sendOtp, verifyOtp, completeProfile, firebaseUser, profile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const [societies, setSocieties] = useState<Society[]>([]);
  const [name, setName] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [flatNumber, setFlatNumber] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Already fully signed in (has a completed profile) → leave the login page.
  useEffect(() => {
    if (step === "phone" && firebaseUser && profile?.name) {
      router.replace("/");
    }
  }, [step, firebaseUser, profile, router]);

  useEffect(() => {
    if (step === "profile") {
      listSocieties().then(setSocieties).catch(() => setSocieties([]));
    }
  }, [step]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendCountdown = () => {
    setResendIn(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1 && timerRef.current) clearInterval(timerRef.current);
        return s - 1;
      });
    }, 1000);
  };

  const doSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendOtp(phone);
      setStep("otp");
      startResendCountdown();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const doVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { needsProfile } = await verifyOtp(code);
      if (needsProfile) {
        setStep("profile");
      } else {
        router.replace("/");
      }
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const doCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await completeProfile({ name, phone, societyId, flatNumber });
      router.replace("/");
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-display text-3xl mb-1">
        {step === "profile" ? "A few more details" : "Sign in to mqcart"}
      </h1>
      <p className="text-muted text-sm mb-8">
        {step === "phone" &&
          "Enter your mobile number — we'll text you a one-time code."}
        {step === "otp" && `Enter the 6-digit code sent to +91 ${phone}.`}
        {step === "profile" &&
          "Tell us where to deliver so orders reach the right door."}
      </p>

      {step === "phone" && (
        <form onSubmit={doSendOtp} className="space-y-4">
          <Field label="Mobile number">
            <div className="flex items-center gap-2">
              <span className="text-muted">+91</span>
              <input
                required
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                className="input"
                placeholder="10-digit number"
              />
            </div>
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={busy || phone.length !== 10} className="submit">
            {busy ? "Sending…" : "Send OTP"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={doVerify} className="space-y-4">
          <Field label="One-time code">
            <input
              required
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="input tracking-[0.4em] text-center text-lg"
              placeholder="••••••"
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={busy || code.length !== 6} className="submit">
            {busy ? "Verifying…" : "Verify & continue"}
          </button>
          <button
            type="button"
            disabled={resendIn > 0 || busy}
            onClick={() => doSendOtp()}
            className="w-full text-sm text-muted hover:text-ink disabled:opacity-60"
          >
            {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
            className="w-full text-sm text-muted hover:text-ink underline underline-offset-4"
          >
            Change number
          </button>
        </form>
      )}

      {step === "profile" && (
        <form onSubmit={doCompleteProfile} className="space-y-4">
          <Field label="Full name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={busy || !societyId} className="submit">
            {busy ? "Saving…" : "Finish"}
          </button>
        </form>
      )}

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
        .submit {
          width: 100%;
          border-radius: 9999px;
          background: var(--accent);
          color: #fff;
          padding: 0.75rem 0;
          font-weight: 500;
          transition: opacity 0.15s;
        }
        .submit:disabled {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}

function errText(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("invalid-verification-code")) return "That code isn't right.";
  if (msg.includes("code-expired") || msg.includes("session-expired"))
    return "That code expired — request a new one.";
  if (msg.includes("too-many-requests"))
    return "Too many attempts. Try again in a little while.";
  if (msg.includes("invalid-phone-number"))
    return "That doesn't look like a valid mobile number.";
  if (msg.includes("captcha")) return "Verification check failed — please retry.";
  return msg.replace(/^Firebase:\s*/, "");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-ink/70 mb-1">{label}</span>
      {children}
    </label>
  );
}
