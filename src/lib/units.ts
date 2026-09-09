// Pack-size units for simple (non-variant) products. Mirrored in
// lib/config/units.dart on the mobile app — keep them identical.
export const UNIT_TYPES = ["g", "kg", "ml", "L", "pcs", "pack", "dozen"] as const;

export type UnitType = (typeof UNIT_TYPES)[number];
