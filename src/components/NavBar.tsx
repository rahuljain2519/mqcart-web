"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export default function NavBar() {
  const { profile, firebaseUser, signOut } = useAuth();
  const { items } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  const itemCount = items.reduce((n, i) => n + i.quantity, 0);

  const roleLinks =
    profile?.role === "admin"
      ? [
          { href: "/admin", label: "Overview" },
          { href: "/admin/societies", label: "Societies" },
          { href: "/admin/users", label: "Sellers" },
          { href: "/admin/sellers", label: "Applications" },
        ]
      : profile?.role === "seller"
      ? [
          { href: "/seller", label: "Dashboard" },
          { href: "/seller/products", label: "Products" },
          { href: "/seller/orders", label: "Orders" },
        ]
      : [
          { href: "/", label: "Shop" },
          { href: "/shops", label: "Shops" },
          { href: "/orders", label: "My orders" },
        ];

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 flex items-center justify-between h-16">
        <Link href="/" className="font-display text-2xl tracking-tight text-ink">
          mqcart
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          {roleLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname === l.href
                  ? "text-accent-ink font-medium"
                  : "text-ink/70 hover:text-ink transition-colors"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {profile?.role !== "seller" && profile?.role !== "admin" && (
            <Link
              href="/cart"
              className="relative text-sm text-ink/80 hover:text-ink"
              aria-label="Cart"
            >
              Cart
              {itemCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-accent text-white text-xs w-5 h-5">
                  {itemCount}
                </span>
              )}
            </Link>
          )}

          {firebaseUser ? (
            <button
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="text-sm text-ink/60 hover:text-ink"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="text-sm rounded-full bg-ink text-bg px-4 py-2 hover:bg-ink/85 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
