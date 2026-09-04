// Single source of truth for categories across the web app. The mobile app
// mirrors this list in lib/config/categories.dart — keep them identical.
//
// One canonical list is used for both a shop's category and a product's
// category (they were three drifting lists before). Buyer filtering does an
// EXACT match after normalising through CATEGORY_ALIASES, so existing products
// saved with legacy names ("Groceries", "Household", "Clothing", "Stationary")
// still land in the right bucket — no data migration needed.

export const PRODUCT_CATEGORIES = [
  "Grocery",
  "Bakery",
  "Snacks",
  "Personal Care",
  "Home & Utility",
  "Stationery",
  "Fashion",
  "Food",
  "Art & Decor",
  "Other",
] as const;

// Shop application uses the same set.
export const SHOP_CATEGORIES = PRODUCT_CATEGORIES;

// Buyer filter chips = "All" + the canonical list (minus the catch-all "Other").
export const CATEGORIES = [
  "All",
  ...PRODUCT_CATEGORIES.filter((c) => c !== "Other"),
] as const;

/** Legacy / misspelled values seen in existing product docs → canonical. */
export const CATEGORY_ALIASES: Record<string, string> = {
  groceries: "Grocery",
  grocery: "Grocery",
  household: "Home & Utility",
  "home and utility": "Home & Utility",
  "home & utility": "Home & Utility",
  stationary: "Stationery",
  stationery: "Stationery",
  clothing: "Fashion",
  fashion: "Fashion",
  "art and decor": "Art & Decor",
  "art & decor": "Art & Decor",
};

export function normalizeCategory(raw: string): string {
  const key = raw.toLowerCase().trim();
  return CATEGORY_ALIASES[key] ?? raw.trim();
}

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
  Other: "🏷️",
};

export function matchesCategory(productCategory: string, selected: string): boolean {
  if (selected === "All") return true;
  return normalizeCategory(productCategory) === selected;
}
