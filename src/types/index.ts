export type UserRole = "buyer" | "seller" | "admin";
// Values the app actually writes across its flow:
// none -> pending -> approved -> active, or rejected / inactive.
export type SellerStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "inactive";
// Matches the mobile app: placed -> accepted -> delivered, or rejected.
export type OrderStatus = "placed" | "accepted" | "delivered" | "rejected";
export type PaymentMethod = "cod" | "razorpay";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface AppUser {
  uid: string;
  name: string;
  phone: string;
  role: UserRole;
  societyId: string;
  flatNumber: string;
  sellerStatus: SellerStatus;
  shopId?: string | null;
}

export interface Banner {
  id: string;
  imageUrl: string;
  /** Optional destination when a viewer clicks the banner — e.g. /sell, /shops. */
  linkUrl?: string;
  order: number;
  isActive: boolean;
}

export interface Society {
  id: string;
  name: string;
  city: string;
  isActive: boolean;
}

export interface Shop {
  shopId: string;
  sellerId: string;
  societyId: string;
  shopName: string;
  /** Copied from the seller's application at shop-creation time. Older shops predate this field. */
  category?: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  address: string;
  phone: string;
  plan: string;
  productLimit: number;
  productCount: number;
  transactionFeePercent: number;
  isActive: boolean;
  isVerified: boolean;
  deliveryUnit: DeliveryUnit;
  deliveryMinValue: number;
  deliveryMaxValue: number;
  deliveryMinMinutes?: number;
  deliveryMaxMinutes?: number;
  planStatus?: string;
  /** Seller-provided; required before an admin can create a Razorpay Route
   *  (linked account) for automatic settlement — nothing else in this app
   *  collects an email. */
  email?: string;
  /** Razorpay Route — set once an admin creates a linked account for this
   *  seller (see createSellerRouteAccount). */
  razorpayAccountId?: string;
  razorpayRouteProductId?: string;
  /** "pending" | "needs_attention" | "under_review" | "activated" | "rejected" */
  routeStatus?: string;
}

export type DeliveryUnit = "minutes" | "hours" | "days";

/** A selectable option within one listing — e.g. { name: "500g", price: 120, quantity: 30 }. */
export interface ProductOption {
  name: string;
  price: number;
  quantity: number;
}

export interface Product {
  id: string;
  shopId: string;
  sellerId: string;
  societyId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  subcategory?: string;
  description: string;
  images: string[];
  coverImage: string;
  isActive: boolean;
  // Optional standard catalog fields (simple/non-variant products only —
  // variant products keep encoding size in each option's name, e.g. "500g").
  brand?: string;
  unitValue?: number; // e.g. 500
  unitType?: string; // one of UNIT_TYPES, e.g. "g"
  mrp?: number; // strike-through price, shown only when mrp > price
  // Optional per-product delivery override (mirrors the app).
  deliveryUnit?: DeliveryUnit;
  deliveryMinValue?: number;
  deliveryMaxValue?: number;
  deliveryMinMinutes?: number;
  deliveryMaxMinutes?: number;
  // Optional variant axis. Absent => simple product (unchanged behaviour).
  // With options: buyer picks one; that option's price + quantity apply. Root
  // `price` = cheapest option, root `quantity` = sum of option quantities.
  optionLabel?: string; // "Weight" | "Size" | "Colour" | custom
  options?: ProductOption[];
}

/** Composite cart-line / order-item key: productId, plus option name when set. */
export function lineKey(productId: string, optionName?: string | null): string {
  return optionName ? `${productId}|${optionName}` : productId;
}

export interface SellerPlan {
  key: string; // free | basic | pro | elite
  name: string;
  monthlyFee: number;
  productLimit: number;
  validityDays?: number | null;
}

export interface SellerSubscription {
  sellerId: string;
  shopId: string;
  currentPlan: string;
  status: string;
  productLimit: number;
  freePlanUsed?: boolean;
  expiresAt?: Date | null;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  sellerId: string;
  shopId: string;
  quantity: number;
  /** Set when the buyer chose a variant option (e.g. "500g"). */
  optionName?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  optionName?: string;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  societyId: string;
  flatNumber: string;
  societyName: string;
  shopName: string;
  shopPhone: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  /** Manual settlement (see Settlement below) — only meaningful for
   *  paymentMethod "razorpay" orders. COD orders are never settled through
   *  this mechanism since the seller already collected cash directly. */
  settled?: boolean;
  settlementId?: string;
}

/** A record of an admin manually paying a seller their share of a batch of
 *  online orders (Option A - fully manual settlement, no Razorpay Route
 *  payout). Created by markOrdersSettled in lib/data.ts. */
export interface Settlement {
  id: string;
  sellerId: string;
  shopName: string;
  orderIds: string[];
  totalAmount: number;
  note?: string;
  settledAt?: Date | null;
  settledBy: string;
}

export interface SellerApplication {
  uid: string;
  shopName: string;
  category: string;
  description: string;
  businessType: string;
  panNumber: string;
  /** Only for Individual / Proprietorship; "" for registered companies. */
  aadhaarLast4: string;
  gstin?: string;
  /** CIN / LLPIN / firm registration no. — for Partnership / Pvt Ltd / LLP. */
  registrationNumber?: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: Date | null;
}

export interface AnalyticsOverview {
  ordersToday: number;
  gmvToday: number;
  ordersMonth: number;
  gmvMonth: number;
  activeSellers?: number;
  activeBuyers?: number;
}
