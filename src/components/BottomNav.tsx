"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { navLinksFor } from "./nav-links";

/** App-style bottom tab bar, shown on small screens only. The top NavBar's
 *  links are hidden below md, so this is the primary nav on mobile web. */
export default function BottomNav() {
  const { profile, firebaseUser } = useAuth();
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const links = navLinksFor(profile?.role);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
      <ul className="flex">
        {links.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          const Icon = l.icon;
          return (
            <li key={l.href} className="flex-1">
              <Link
                href={l.href === "/profile" && !firebaseUser ? "/login" : l.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${
                  active ? "text-accent-ink" : "text-ink/55"
                }`}
              >
                <Icon className="w-6 h-6" />
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
