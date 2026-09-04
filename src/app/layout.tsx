import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import NavBar from "@/components/NavBar";
import BottomNav from "@/components/BottomNav";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mqcart — your society's shops, online",
  description:
    "Order from the shops inside your own residential society. Browse, pay, and track delivery — all in one place.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "mqcart" },
};

export const viewport: Viewport = {
  themeColor: "#ff7a00",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <AuthProvider>
          <CartProvider>
            <NavBar />
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <BottomNav />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
