"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSociety } from "@/lib/data";
import { ChevronDownIcon } from "./icons";

/** "Delivering to Flat 402, Green Valley ▾" — orients the buyer to which
 *  society they're shopping, mirroring the mobile Home header. Tapping it
 *  goes to the profile edit screen. */
export default function AddressBar() {
  const { profile } = useAuth();
  const [society, setSociety] = useState<string>("");

  useEffect(() => {
    if (profile?.societyId) {
      getSociety(profile.societyId).then((s) => setSociety(s?.name ?? ""));
    }
  }, [profile?.societyId]);

  if (!profile || profile.role !== "buyer") return null;

  const line =
    profile.societyId && society
      ? `Flat ${profile.flatNumber || "—"}, ${society}`
      : "Set your delivery address";

  return (
    <Link
      href="/profile"
      className="flex items-center gap-1.5 text-sm text-ink/80 hover:text-ink"
    >
      <span className="text-accent-ink">📍</span>
      <span className="font-medium truncate max-w-[70vw]">{line}</span>
      <ChevronDownIcon className="w-4 h-4 text-ink/50 shrink-0" />
    </Link>
  );
}
