"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { useCart } from "@/context/CartContext";
import { getShop, watchProductsByShop } from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import CartBar from "@/components/CartBar";
import type { Shop, Product } from "@/types";

function ShopDetail() {
  const { shopId } = useParams<{ shopId: string }>();
  const { singleShopId } = useCart();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!shopId) return;
    getShop(shopId).then(setShop).finally(() => setLoadingShop(false));
    const unsub = watchProductsByShop(shopId, setProducts);
    return () => unsub();
  }, [shopId]);

  const shown = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase().trim();
    return products.filter((p) => q === "" || p.name.toLowerCase().includes(q));
  }, [products, search]);

  if (loadingShop) {
    return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Loading…</p>;
  }
  if (!shop) {
    return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Shop not found.</p>;
  }

  const blockedByOtherShop = singleShopId && singleShopId !== shopId;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1">
        {shop.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shop.bannerUrl}
            alt=""
            className="w-full h-40 md:h-52 object-cover"
          />
        )}

        <div className="mx-auto max-w-6xl px-5 py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-green-bg shrink-0">
              {shop.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shop.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div>
              <h1 className="font-display text-3xl">{shop.shopName}</h1>
              {shop.description && (
                <p className="text-muted text-sm mt-1">{shop.description}</p>
              )}
              <p className="text-xs text-muted mt-1">
                Delivery in {shop.deliveryMinValue}–{shop.deliveryMaxValue} {shop.deliveryUnit}
              </p>
            </div>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products in this shop"
            className="w-full border border-line rounded-full px-5 py-2.5 bg-surface mt-6"
          />

          {blockedByOtherShop && (
            <p className="text-sm text-danger mt-4">
              Your cart has items from another shop. Clear it to order from here.
            </p>
          )}
          {notice && <p className="text-sm text-danger mt-3">{notice}</p>}

          {products === null ? (
            <p className="text-muted mt-8">Loading products…</p>
          ) : shown.length === 0 ? (
            <p className="text-muted mt-8">
              {search ? "No matching products." : "This shop hasn't listed any products yet."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6 pb-8">
              {shown.map((p) => (
                <li key={p.id}>
                  <ProductCard
                    product={p}
                    onMultiShop={() =>
                      setNotice("You can order from only one shop at a time.")
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <CartBar />
    </div>
  );
}

export default function ShopPage() {
  return (
    <RoleGuard allow={["buyer"]}>
      <ShopDetail />
    </RoleGuard>
  );
}
