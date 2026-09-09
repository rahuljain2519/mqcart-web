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
