import type { ReactNode } from "react";
import type { UserRole } from "@/types";
import {
  HomeIcon,
  StoreIcon,
  ReceiptIcon,
  UserIcon,
  BoxIcon,
  ChartIcon,
} from "./icons";

export interface NavLink {
  href: string;
  label: string;
  icon: (p: { className?: string }) => ReactNode;
}

/** The primary destinations for a role — shared by the top bar and the
 *  mobile bottom bar so both stay in sync. */
export function navLinksFor(role: UserRole | undefined): NavLink[] {
  if (role === "admin") {
    return [
      { href: "/admin", label: "Overview", icon: ChartIcon },
      { href: "/admin/societies", label: "Societies", icon: StoreIcon },
      { href: "/admin/users", label: "Sellers", icon: UserIcon },
      { href: "/profile", label: "Profile", icon: UserIcon },
    ];
  }
  if (role === "seller") {
    return [
      { href: "/seller", label: "Dashboard", icon: HomeIcon },
      { href: "/seller/products", label: "Products", icon: BoxIcon },
      { href: "/seller/orders", label: "Orders", icon: ReceiptIcon },
      { href: "/profile", label: "Profile", icon: UserIcon },
    ];
  }
  // buyer + signed-out
  return [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/shops", label: "Shops", icon: StoreIcon },
    { href: "/orders", label: "Orders", icon: ReceiptIcon },
    { href: "/profile", label: "Profile", icon: UserIcon },
  ];
}
