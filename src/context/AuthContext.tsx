"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getUser } from "@/lib/data";
import type { AppUser } from "@/types";

/**
 * Phone / OTP auth — same method as the mqcart Flutter app, so a person has ONE
 * Firebase identity (and one users/{uid} doc) across mobile and web. Numbers are
 * normalised to +91XXXXXXXXXX, matching the app's hard-coded India prefix.
 */

interface CompleteProfileInput {
  name: string;
  phone: string;
  societyId: string;
  flatNumber: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  /** Send an OTP to a 10-digit Indian mobile number. */
  sendOtp: (phone10: string) => Promise<void>;
  /** Confirm the OTP. Returns whether the user still needs to fill in a profile. */
  verifyOtp: (code: string) => Promise<{ needsProfile: boolean }>;
  /** Create/merge the users/{uid} doc for a first-time user. */
  completeProfile: (input: CompleteProfileInput) => Promise<void>;
  /** Edit name / society / flat on an existing profile (never touches role). */
  updateProfile: (input: {
    name: string;
    societyId: string;
    flatNumber: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

// Kept outside React state: neither value is serialisable and neither should
// trigger a re-render.
let recaptchaVerifier: RecaptchaVerifier | null = null;
let confirmationResult: ConfirmationResult | null = null;

function toE164(phone10: string): string {
  const digits = phone10.replace(/\D/g, "");
  if (digits.length !== 10) {
    throw new Error("Enter a valid 10-digit mobile number.");
  }
  return `+91${digits}`;
}

function getRecaptcha(): RecaptchaVerifier {
  if (recaptchaVerifier) return recaptchaVerifier;
  recaptchaVerifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
    size: "invisible",
  });
  return recaptchaVerifier;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const p = await getUser(uid);
    setProfile(p);
    return p;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u) {
        await loadProfile(u.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const sendOtp: AuthContextValue["sendOtp"] = async (phone10) => {
    const e164 = toE164(phone10);
    try {
      confirmationResult = await signInWithPhoneNumber(auth, e164, getRecaptcha());
    } catch (err) {
      // A failed attempt can leave the widget in a state that rejects the next
      // try; rebuild it so the user can retry.
      try {
        recaptchaVerifier?.clear();
      } catch {
        /* noop */
      }
      recaptchaVerifier = null;
      throw err;
    }
  };

  const verifyOtp: AuthContextValue["verifyOtp"] = async (code) => {
    if (!confirmationResult) {
      throw new Error("Request an OTP first.");
    }
    const cred = await confirmationResult.confirm(code.trim());
    confirmationResult = null;
    const existing = await loadProfile(cred.user.uid);
    return { needsProfile: !existing || existing.name.trim() === "" };
  };

  const completeProfile: AuthContextValue["completeProfile"] = async (input) => {
    const u = auth.currentUser;
    if (!u) throw new Error("Not signed in.");

    // Only seed role/sellerStatus/shopId when the doc doesn't exist yet — never
    // clobber an existing (e.g. mobile-created) seller/admin.
    const existing = await getDoc(doc(db, "users", u.uid));
    const seed = existing.exists()
      ? {}
      : { role: "buyer", sellerStatus: "none", shopId: null };

    await setDoc(
      doc(db, "users", u.uid),
      {
        name: input.name.trim(),
        // Firebase sets phoneNumber to E.164 after phone auth — store that so
        // it matches how the mobile app records it.
        phone: u.phoneNumber ?? input.phone.trim(),
        societyId: input.societyId,
        flatNumber: input.flatNumber.trim(),
        ...seed,
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await loadProfile(u.uid);
  };

  const updateProfile: AuthContextValue["updateProfile"] = async (input) => {
    const u = auth.currentUser;
    if (!u) throw new Error("Not signed in.");
    await updateDoc(doc(db, "users", u.uid), {
      name: input.name.trim(),
      societyId: input.societyId,
      flatNumber: input.flatNumber.trim(),
      updatedAt: serverTimestamp(),
    });
    await loadProfile(u.uid);
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  const refreshProfile = async () => {
    if (firebaseUser) await loadProfile(firebaseUser.uid);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        sendOtp,
        verifyOtp,
        completeProfile,
        updateProfile,
        signOut,
        refreshProfile,
      }}
    >
      {children}
      {/* Invisible reCAPTCHA target for phone auth. */}
      <div id={RECAPTCHA_CONTAINER_ID} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
