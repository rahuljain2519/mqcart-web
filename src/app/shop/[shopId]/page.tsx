"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { useCart } from "@/context/CartContext";
import { getShop, listProductsByShop } from "@/lib/data";
import type { Shop, Product } from "@/types";

function ShopDetail() {
  const { shopId } = useParams<{ shopId: string }>();
  const { addItem, singleShopId } = useCart();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!shopId) return;
    Promise.all([getShop(shopId), listProductsByShop(shopId)])
      .then(([s, p]) => {
        setShop(s);
        setProducts(p.filter((x) => x.isActive));
      })
      .finally(() => setLoading(false));
  }, [shopId]);

  if (loading) {
    return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Loading…</p>;
  }

  if (!shop) {
    return <p className="mx-auto max-w-6xl px-5 py-12 text-muted">Shop not found.</p>;
  }

  const blockedByOtherShop = singleShopId && singleShopId !== shopId;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="border border-line rounded-2xl bg-surface p-6 mb-8">
        <h1 className="font-display text-3xl">{shop.shopName}</h1>
        <p className="text-muted mt-1">{shop.description}</p>
        <p className="text-sm text-muted mt-3">
          {shop.address} {shop.phone && `· ${shop.phone}`}
        </p>
      </div>

      {blockedByOtherShop && (
        <p className="text-sm text-danger mb-6">
          Your cart has items from another shop. Clear your cart to order from
          here instead.
        </p>
      )}

      {products.length === 0 ? (
        <p className="text-muted">This shop hasn&rsquo;t listed any products yet.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => (
            <li
              key={p.id}
              className="border border-line rounded-2xl bg-surface p-4 flex flex-col"
            >
              <div className="h-32 bg-green-bg rounded-xl mb-3" />
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted line-clamp-2 flex-1">
                {p.description}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className="font-medium">₹{p.price.toFixed(0)}</span>
                <button
                  disabled={!!blockedByOtherShop}
                  onClick={() => {
                    addItem(p, shopId);
                    setAdded(p.id);
                    setTimeout(() => setAdded(null), 1200);
                  }}
                  className="text-sm rounded-full bg-ink text-bg px-4 py-1.5 hover:bg-ink/85 transition-colors disabled:opacity-40"
                >
                  {added === p.id ? "Added" : "Add"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
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
