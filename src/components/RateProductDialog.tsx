"use client";

import { useEffect, useState } from "react";
import { getReview, submitReview, getProduct } from "@/lib/data";
import { StarInput } from "@/components/StarRating";
import type { Order, OrderItem } from "@/types";

/** Inline "Rate" control for one delivered order item - checks once on
 *  mount whether this order+product already has a review (so a page
 *  refresh doesn't offer to rate twice), then opens a small star+comment
 *  dialog on click. */
export default function RateProductDialog({
  order,
  item,
  buyerName,
}: {
  order: Order;
  item: OrderItem;
  buyerName: string;
}) {
  const [rated, setRated] = useState<boolean | null>(null); // null = checking
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReview(order.id, item.productId).then((r) => {
      if (!cancelled) setRated(!!r);
    });
    return () => {
      cancelled = true;
    };
  }, [order.id, item.productId]);

  if (rated === null) return null;
  if (rated) {
    return <span className="text-xs text-muted">Rated</span>;
  }

  const submit = async () => {
    if (rating === 0) {
      setError("Pick a star rating first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const product = await getProduct(item.productId);
      if (!product) throw new Error("This product no longer exists.");
      await submitReview({
        orderId: order.id,
        productId: item.productId,
        shopId: product.shopId,
        sellerId: order.sellerId,
        buyerId: order.buyerId,
        buyerName,
        rating,
        comment: comment.trim() || undefined,
      });
      setRated(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs rounded-full border border-accent text-accent-ink px-3 py-1 hover:bg-accent/5 transition-colors"
      >
        Rate
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5">
            <p className="font-medium">Rate {item.name}</p>
            <div className="mt-3">
              <StarInput value={rating} onChange={setRating} />
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience (optional)"
              rows={3}
              className="w-full border border-line rounded-xl px-3 py-2 mt-3 text-sm"
            />
            {error && <p className="text-sm text-danger mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 rounded-full bg-accent text-white px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-ink/40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
