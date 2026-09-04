/** Compact relative time: "just now", "5m ago", "3h ago", "2d ago",
 *  then falls back to a short date. */
export function timeAgo(date: Date | null | undefined): string {
  if (!date) return "";
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
