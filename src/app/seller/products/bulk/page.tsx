"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { getShopBySeller, bulkCreateProducts } from "@/lib/data";
import { uploadProductImages } from "@/lib/storage";
import type { Shop, Product } from "@/types";

type Row = {
  name: string;
  price: number;
  quantity: number;
  category: string;
  description: string;
  isActive: boolean;
  imagePrefix: string;
  subcategory?: string;
  brand?: string;
  unitValue?: number;
  unitType?: string;
  mrp?: number;
};

const HEADERS = ["name", "price", "quantity", "category", "description", "isActive", "imagePrefix"];

// Optional columns — included only when present in the CSV header, so
// existing CSVs without them keep working unchanged.
const OPTIONAL_HEADERS = ["subcategory", "brand", "unitValue", "unitType", "mrp"];

// Small CSV parser: handles quoted fields and embedded commas/quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }
  return rows;
}

function BulkUpload() {
  const { profile } = useAuth();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [rows, setRows] = useState<Row[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;
    getShopBySeller(profile.uid).then(setShop);
  }, [profile?.uid]);

  const onCsv = async (file: File) => {
    setError(null);
    try {
      const grid = parseCsv(await file.text());
      if (grid.length < 2) throw new Error("CSV has no data rows.");
      const header = grid[0].map((h) => h.trim());
      const idx = (k: string) => header.indexOf(k);
      for (const h of HEADERS) {
        if (idx(h) === -1) throw new Error(`Missing column: ${h}`);
      }
      const parsed: Row[] = grid.slice(1).map((r, i) => {
        const price = parseFloat(r[idx("price")]);
        const quantity = parseInt(r[idx("quantity")], 10);
        if (!r[idx("name")]?.trim()) throw new Error(`Row ${i + 1}: name is required.`);
        if (!Number.isFinite(price)) throw new Error(`Row ${i + 1}: bad price.`);
        if (!Number.isFinite(quantity)) throw new Error(`Row ${i + 1}: bad quantity.`);

        const subcategory = idx("subcategory") !== -1 ? r[idx("subcategory")]?.trim() : undefined;
        const brand = idx("brand") !== -1 ? r[idx("brand")]?.trim() : undefined;
        const unitValueRaw = idx("unitValue") !== -1 ? parseFloat(r[idx("unitValue")]) : NaN;
        const unitValue = Number.isFinite(unitValueRaw) ? unitValueRaw : undefined;
        const unitType =
          unitValue != null && idx("unitType") !== -1 ? r[idx("unitType")]?.trim() : undefined;
        const mrpRaw = idx("mrp") !== -1 ? parseFloat(r[idx("mrp")]) : NaN;
        const mrp = Number.isFinite(mrpRaw) ? mrpRaw : undefined;

        return {
          name: r[idx("name")].trim(),
          price,
          quantity,
          category: r[idx("category")]?.trim() ?? "",
          description: r[idx("description")]?.trim() ?? "",
          isActive: (r[idx("isActive")]?.trim().toLowerCase() ?? "true") !== "false",
          imagePrefix: r[idx("imagePrefix")]?.trim() ?? "",
          ...(subcategory ? { subcategory } : {}),
          ...(brand ? { brand } : {}),
          ...(unitValue != null ? { unitValue } : {}),
          ...(unitType ? { unitType } : {}),
          ...(mrp != null ? { mrp } : {}),
        };
      });
      setRows(parsed);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : "Could not read the CSV.");
    }
  };

  const matchFor = (prefix: string) =>
    prefix
      ? images.filter((f) => f.name.toLowerCase().startsWith(prefix.toLowerCase()))
      : [];

  const upload = async () => {
    if (!shop || !profile) return;
    setError(null);

    if (shop.productCount + rows.length > shop.productLimit) {
      setError(
        `This would exceed your plan limit (${shop.productLimit}). You have room for ${
          shop.productLimit - shop.productCount
        } more.`
      );
      return;
    }
    for (const r of rows) {
      if (matchFor(r.imagePrefix).length === 0) {
        setError(`No image files match prefix "${r.imagePrefix}" (product "${r.name}").`);
        return;
      }
    }

    const total = rows.length * 2; // upload pass + create pass
    setProgress({ done: 0, total });
    try {
      const built: Omit<Product, "id">[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const urls = await uploadProductImages(
          shop.shopId,
          `${Date.now()}-${i}`,
          matchFor(r.imagePrefix).slice(0, 4)
        );
        built.push({
          shopId: shop.shopId,
          sellerId: profile.uid,
          societyId: shop.societyId,
          name: r.name,
          price: r.price,
          quantity: r.quantity,
          category: r.category,
          ...(r.subcategory ? { subcategory: r.subcategory } : {}),
          ...(r.brand ? { brand: r.brand } : {}),
          ...(r.unitValue != null ? { unitValue: r.unitValue } : {}),
          ...(r.unitType ? { unitType: r.unitType } : {}),
          ...(r.mrp != null ? { mrp: r.mrp } : {}),
          description: r.description,
          images: urls,
          coverImage: urls[0] ?? "",
          isActive: r.isActive,
        });
        setProgress({ done: i + 1, total });
      }
      await bulkCreateProducts(built, (done) =>
        setProgress({ done: rows.length + done, total })
      );
      router.push("/seller/products");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setProgress(null);
    }
  };

  if (shop === undefined) {
    return <p className="mx-auto max-w-3xl px-5 py-12 text-muted">Loading…</p>;
  }
  if (!shop) {
    return <p className="mx-auto max-w-3xl px-5 py-12 text-muted">Create your shop first.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl">Bulk upload</h1>
        <Link href="/seller/products" className="text-sm text-muted hover:text-ink">
          ← Products
        </Link>
      </div>
      <p className="text-sm text-muted mb-8">
        CSV columns: <code>{HEADERS.join(", ")}</code>. Each row&rsquo;s{" "}
        <code>imagePrefix</code> matches image files whose name starts with that
        prefix (e.g. prefix <code>milk</code> → <code>milk.jpg</code>,{" "}
        <code>milk-2.png</code>). Optional columns:{" "}
        <code>{OPTIONAL_HEADERS.join(", ")}</code>.
      </p>

      <div className="space-y-4">
        <label className="block">
          <span className="block text-sm text-ink/70 mb-1">Products CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
            className="text-sm"
          />
        </label>
        <label className="block">
          <span className="block text-sm text-ink/70 mb-1">Image files</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImages(Array.from(e.target.files ?? []))}
            className="text-sm"
          />
        </label>
      </div>

      {error && <p className="text-sm text-danger mt-4">{error}</p>}

      {rows.length > 0 && (
        <div className="mt-6 border border-line rounded-2xl bg-surface divide-y divide-line">
          {rows.map((r, i) => {
            const n = matchFor(r.imagePrefix).length;
            return (
              <div key={i} className="p-3 flex items-center justify-between text-sm">
                <span>
                  {r.name} · ₹{r.price} · qty {r.quantity} · {r.category || "—"}
                </span>
                <span className={n === 0 ? "text-danger" : "text-muted"}>
                  {n} image{n === 1 ? "" : "s"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {progress && (
        <p className="text-sm text-muted mt-4">
          Uploading… {progress.done}/{progress.total}
        </p>
      )}

      <button
        onClick={upload}
        disabled={rows.length === 0 || images.length === 0 || progress !== null}
        className="mt-6 rounded-full bg-accent text-white px-6 py-3 font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
      >
        {progress ? "Uploading…" : `Upload ${rows.length || ""} products`.trim()}
      </button>
    </div>
  );
}

export default function BulkUploadPage() {
  return (
    <RoleGuard allow={["seller"]}>
      <BulkUpload />
    </RoleGuard>
  );
}
