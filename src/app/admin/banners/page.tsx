"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import RoleGuard from "@/components/RoleGuard";
import {
  watchAllBanners,
  newBannerId,
  createBanner,
  updateBanner,
  deleteBanner,
} from "@/lib/data";
import { uploadBannerImage } from "@/lib/storage";
import type { Banner } from "@/types";

function Banners() {
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = watchAllBanners(setBanners);
    return () => unsub();
  }, []);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });
    try {
      const nextOrder = banners?.length ?? 0;
      for (let i = 0; i < list.length; i++) {
        const id = newBannerId();
        const imageUrl = await uploadBannerImage(id, list[i]);
        await createBanner({ id, imageUrl, order: nextOrder + i });
        setProgress({ done: i + 1, total: list.length });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const move = async (banner: Banner, direction: -1 | 1) => {
    if (!banners) return;
    const sorted = [...banners].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((b) => b.id === banner.id);
    const j = i + direction;
    if (j < 0 || j >= sorted.length) return;
    const other = sorted[j];
    await Promise.all([
      updateBanner(banner.id, { order: other.order }),
      updateBanner(other.id, { order: banner.order }),
    ]);
  };

  const toggleActive = (banner: Banner) =>
    updateBanner(banner.id, { isActive: !banner.isActive });

  const remove = async (banner: Banner) => {
    if (!confirm("Delete this banner? This cannot be undone.")) return;
    await deleteBanner(banner.id);
  };

  const sorted = banners ? [...banners].sort((a, b) => a.order - b.order) : null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl mb-2">Landing page banners</h1>
      <p className="text-muted mb-8">
        Shown as a sliding carousel at the top of the landing page for signed-out
        visitors. Upload multiple images at once — they&apos;ll play in order.
      </p>

      <label className="block border border-dashed border-line rounded-2xl p-6 text-center mb-8 bg-surface">
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={(e) => upload(e.target.files)}
          className="text-sm text-ink file:mr-3 file:rounded-full file:border-0 file:bg-ink file:text-bg file:px-4 file:py-2 file:text-sm file:font-medium file:cursor-pointer hover:file:bg-ink/85 disabled:opacity-60"
        />
        <p className="text-xs text-muted mt-2">
          {uploading
            ? `Uploading ${progress?.done ?? 0}/${progress?.total ?? 0}…`
            : "Select one or more images (wide, landscape photos work best)."}
        </p>
      </label>
      {error && <p className="text-sm text-danger mb-6">{error}</p>}

      {sorted === null ? (
        <p className="text-muted">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-muted">No banners yet — upload one above.</p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((b, i) => (
            <li
              key={b.id}
              className="flex items-center gap-4 border border-line rounded-2xl bg-surface p-3"
            >
              <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-bg shrink-0">
                <Image src={b.imageUrl} alt="" fill sizes="112px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Banner {i + 1}</p>
                <p className="text-xs text-muted">
                  {b.isActive ? "Visible on landing page" : "Hidden"}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => move(b, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="w-8 h-8 rounded-full border border-line hover:border-ink/40 disabled:opacity-30 disabled:hover:border-line"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(b, 1)}
                  disabled={i === sorted.length - 1}
                  aria-label="Move down"
                  className="w-8 h-8 rounded-full border border-line hover:border-ink/40 disabled:opacity-30 disabled:hover:border-line"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(b)}
                  className={`text-xs rounded-full px-3 py-1.5 ml-2 ${
                    b.isActive ? "bg-green-bg text-green" : "bg-line text-ink/60"
                  }`}
                >
                  {b.isActive ? "Active" : "Hidden"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(b)}
                  className="text-sm text-muted hover:text-danger ml-2"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminBannersPage() {
  return (
    <RoleGuard allow={["admin"]}>
      <Banners />
    </RoleGuard>
  );
}
