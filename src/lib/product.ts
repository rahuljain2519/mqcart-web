import type { Product } from "@/types";

export function hasOptions(p: Product): boolean {
  return Array.isArray(p.options) && p.options.length > 0;
}

export function minOptionPrice(p: Product): number {
  return hasOptions(p)
    ? Math.min(...p.options!.map((o) => o.price))
    : p.price;
}

/** "₹120" for a simple product, "from ₹80" when it has options. */
export function priceLabel(p: Product): string {
  return hasOptions(p)
    ? `from ₹${minOptionPrice(p).toFixed(0)}`
    : `₹${p.price.toFixed(0)}`;
}

/** Live stock for a product, or for one option when a name is given. */
export function stockFor(p: Product, optionName?: string | null): number {
  if (hasOptions(p)) {
    if (!optionName) return p.options!.reduce((s, o) => s + o.quantity, 0);
    return p.options!.find((o) => o.name === optionName)?.quantity ?? 0;
  }
  return p.quantity;
}

export function priceFor(p: Product, optionName?: string | null): number {
  if (hasOptions(p) && optionName) {
    return p.options!.find((o) => o.name === optionName)?.price ?? p.price;
  }
  return p.price;
}

export function hasDiscount(p: Product): boolean {
  return typeof p.mrp === "number" && p.mrp > p.price;
}

export function discountPercent(p: Product): number {
  if (!hasDiscount(p)) return 0;
  return Math.round(((p.mrp! - p.price) / p.mrp!) * 100);
}

/** e.g. "500 g", or null when no pack size is set. */
export function packSizeLabel(p: Product): string | null {
  if (p.unitValue == null || !p.unitType) return null;
  const formatted = p.unitValue % 1 === 0 ? p.unitValue.toFixed(0) : p.unitValue.toFixed(1);
  return `${formatted} ${p.unitType}`;
}
