"use client";

import { useEffect, useState } from "react";
import { watchReviewsForProduct } from "@/lib/data";
import { StarDisplay, RatingSummary } from "@/components/StarRating";
import type { Product, Review } from "@/types";

function timeAgo(d?: Date | null) {
  if (!d) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString();
}

export default function ProductReviews({ product }: { product: Product }) {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const unsub = watchReviewsForProduct(product.id, setReviews);
    return () => unsub();
  }, [product.id]);

  return (
    <div className="mt-6 border-t border-line pt-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Ratings & reviews</h2>
        <RatingSummary ratingSum={product.ratingSum} reviewCount={product.reviewCount} />
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted mt-3">No reviews yet.</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-line last:border-0 pb-3 last:pb-0">
              <div className="flex items-center gap-2">
                <StarDisplay rating={r.rating} />
                <span className="text-sm font-medium">{r.buyerName}</span>
                <span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
              </div>
              {r.comment && <p className="text-sm text-ink/80 mt-1">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
