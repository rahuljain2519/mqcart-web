// Buyer-facing category filter — mirrors the mobile app's CategoryScroller.
// "All" is UI-only. Matching against product.category is a case-insensitive
// substring test (same as buyer_home.dart) so minor naming drift between the
// seller product form and this list still lines up (e.g. "Groceries" ~ "Grocery").

export const CATEGORIES = [
  "All",
  "Grocery",
  "Bakery",
  "Snacks",
  "Personal Care",
  "Home & Utility",
  "Stationery",
  "Fashion",
  "Food",
  "Art & Decor",
] as const;

export const CATEGORY_EMOJI: Record<string, string> = {
  All: "🛒",
  Grocery: "🥬",
  Bakery: "🍞",
  Snacks: "🍿",
  "Personal Care": "🧴",
  "Home & Utility": "🏠",
  Stationery: "✏️",
  Fashion: "👗",
  Food: "🍱",
  "Art & Decor": "🎨",
};

export function matchesCategory(productCategory: string, selected: string): boolean {
  if (selected === "All") return true;
  const p = productCategory.toLowerCase().trim();
  const s = selected.toLowerCase().trim();
  return p.length > 0 && p.includes(s);
}
