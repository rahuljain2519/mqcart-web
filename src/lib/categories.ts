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

// Second-level taxonomy, product-only (shops keep a flat category). Additive —
// existing products simply have no subcategory and keep working unchanged.
export const SUBCATEGORIES: Record<string, string[]> = {
  Grocery: [
    "Fruits & Vegetables",
    "Atta, Rice & Dal",
    "Masalas & Cooking Oils",
    "Dairy & Eggs",
    "Breakfast & Cereals",
    "Tea, Coffee & Beverages",
    "Packaged Food",
    "Other",
  ],
  Bakery: ["Bread & Buns", "Cakes & Pastries", "Cookies & Rusks", "Other"],
  Snacks: [
    "Chips & Namkeen",
    "Chocolates & Candies",
    "Ice Cream & Frozen Desserts",
    "Noodles & Instant Food",
    "Other",
  ],
  "Personal Care": [
    "Bath & Body",
    "Hair Care",
    "Oral Care",
    "Skin Care",
    "Feminine Hygiene",
    "Baby Care",
    "Other",
  ],
  "Home & Utility": [
    "Cleaning Supplies",
    "Kitchen & Dining",
    "Electricals & Batteries",
    "Pooja Needs",
    "Other",
  ],
  Stationery: [
    "Notebooks & Paper",
    "Pens & Writing",
    "Art Supplies",
    "Office Supplies",
    "Other",
  ],
  Fashion: [
    "Men's Wear",
    "Women's Wear",
    "Kids' Wear",
    "Footwear",
    "Accessories",
    "Other",
  ],
  Food: ["Ready to Eat", "Sweets", "Beverages", "Tiffin & Meals", "Other"],
  "Art & Decor": [
    "Wall Decor",
    "Showpieces",
    "Plants & Pots",
    "Festive Decor",
    "Other",
  ],
  Other: ["Other"],
};

export function subcategoriesFor(category: string): string[] {
  return SUBCATEGORIES[normalizeCategory(category)] ?? ["Other"];
}
