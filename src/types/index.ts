export type UserRole = "buyer" | "seller" | "admin";
export type SellerStatus = "none" | "pending" | "active" | "inactive";
export type OrderStatus = "placed" | "accepted" | "delivered" | "cancelled" | "completed";
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
  deliveryUnit: "minutes" | "hours" | "days";
  deliveryMinValue: number;
  deliveryMaxValue: number;
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
  description: string;
  images: string[];
  coverImage: string;
  isActive: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  sellerId: string;
  shopId: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
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
  aadhaarLast4: string;
  gstin?: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: Date | null;
}

export interface AnalyticsOverview {
  ordersToday: number;
  gmvToday: number;
  ordersMonth: number;
  gmvMonth: number;
}
