"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import ShopForm from "@/components/ShopForm";
import { useAuth } from "@/context/AuthContext";
import { getShopBySeller } from "@/lib/data";
import type { Shop } from "@/types";

function ShopSettings() {
  const { profile } = useAuth();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);

  useEffect(() => {
    if (!profile?.uid) return;
    getShopBySeller(profile.uid).then(setShop);
  }, [profile?.uid]);

  if (shop === undefined) {
    return <p className="mx-auto max-w-2xl px-5 py-12 text-muted">Loading…</p>;
  }
  if (!shop || !profile) {
    return (
      <p className="mx-auto max-w-2xl px-5 py-12 text-muted">No shop found.</p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="font-display text-3xl mb-8">Shop settings</h1>
      <ShopForm
        mode="edit"
        shop={shop}
        sellerId={profile.uid}
        societyId={profile.societyId}
        uid={profile.uid}
        onDone={() => router.push("/seller")}
      />
    </div>
  );
}

export default function ShopSettingsPage() {
  return (
    <RoleGuard allow={["seller"]}>
      <ShopSettings />
    </RoleGuard>
  );
}
