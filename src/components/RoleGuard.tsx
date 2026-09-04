"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types";

export default function RoleGuard({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { profile, firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (profile && !allow.includes(profile.role)) {
      router.replace("/");
    }
  }, [loading, firebaseUser, profile, allow, router]);

  if (loading || !firebaseUser || !profile || !allow.includes(profile.role)) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-24 text-center text-muted">
        Checking access…
      </div>
    );
  }

  return <>{children}</>;
}
