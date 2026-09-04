import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  AppUser,
  Society,
  Shop,
  Product,
  Order,
  OrderItem,
  SellerApplication,
  AnalyticsOverview,
} from "@/types";

const toDate = (v: Timestamp | Date | null | undefined) =>
  v instanceof Timestamp ? v.toDate() : v ?? null;

/* ---------------------------------- Users --------------------------------- */

export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    name: d.name ?? "",
    phone: d.phone ?? "",
    role: d.role ?? "buyer",
    societyId: d.societyId ?? "",
    flatNumber: d.flatNumber ?? "",
    sellerStatus: d.sellerStatus ?? "none",
    shopId: d.shopId ?? null,
  };
}

/* -------------------------------- Societies -------------------------------- */

export async function listSocieties(): Promise<Society[]> {
  const snap = await getDocs(
    query(collection(db, "societies"), where("isActive", "==", true))
  );
  return snap.docs.map((s) => ({ id: s.id, ...(s.data() as Omit<Society, "id">) }));
}

export async function getSociety(societyId: string): Promise<Society | null> {
  const snap = await getDoc(doc(db, "societies", societyId));
  if (!snap.exists()) return null;
  return { id: societyId, ...(snap.data() as Omit<Society, "id">) };
}

/* ----------------------------------- Shops ---------------------------------- */

export async function listShopsBySociety(societyId: string): Promise<Shop[]> {
  const snap = await getDocs(
    query(
      collection(db, "shops"),
      where("societyId", "==", societyId),
      where("isActive", "==", true)
    )
  );
  return snap.docs.map((s) => ({ shopId: s.id, ...(s.data() as Omit<Shop, "shopId">) }));
}

export async function getShop(shopId: string): Promise<Shop | null> {
  const snap = await getDoc(doc(db, "shops", shopId));
  if (!snap.exists()) return null;
  return { shopId, ...(snap.data() as Omit<Shop, "shopId">) };
}

export async function getShopBySeller(sellerId: string): Promise<Shop | null> {
  const snap = await getDocs(
    query(collection(db, "shops"), where("sellerId", "==", sellerId), fsLimit(1))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { shopId: d.id, ...(d.data() as Omit<Shop, "shopId">) };
}

/* --------------------------------- Products --------------------------------- */

export async function listProductsByShop(shopId: string): Promise<Product[]> {
  const snap = await getDocs(
    query(collection(db, "products"), where("shopId", "==", shopId))
  );
  return snap.docs.map((s) => ({ id: s.id, ...(s.data() as Omit<Product, "id">) }));
}

export async function listProductsBySociety(societyId: string): Promise<Product[]> {
  const snap = await getDocs(
    query(
      collection(db, "products"),
      where("societyId", "==", societyId),
      where("isActive", "==", true)
    )
  );
  return snap.docs.map((s) => ({ id: s.id, ...(s.data() as Omit<Product, "id">) }));
}

export async function getProduct(productId: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, "products", productId));
  if (!snap.exists()) return null;
  return { id: productId, ...(snap.data() as Omit<Product, "id">) };
}

export async function addProduct(product: Omit<Product, "id">) {
  return addDoc(collection(db, "products"), product);
}

export async function updateProduct(productId: string, patch: Partial<Product>) {
  return updateDoc(doc(db, "products", productId), patch);
}

/* ---------------------------------- Orders ---------------------------------- */

export async function createOrder(order: {
  buyerId: string;
  sellerId: string;
  societyId: string;
  societyName: string;
  flatNumber: string;
  shopName: string;
  shopPhone: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: "cod" | "razorpay";
}) {
  return addDoc(collection(db, "orders"), {
    ...order,
    status: "placed",
    paymentStatus: order.paymentMethod === "cod" ? "pending" : "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listOrdersByBuyer(buyerId: string): Promise<Order[]> {
  const snap = await getDocs(
    query(
      collection(db, "orders"),
      where("buyerId", "==", buyerId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((s) => {
    const d = s.data();
    return {
      id: s.id,
      ...d,
      createdAt: toDate(d.createdAt),
      updatedAt: toDate(d.updatedAt),
    } as Order;
  });
}

export async function listOrdersBySeller(sellerId: string): Promise<Order[]> {
  const snap = await getDocs(
    query(
      collection(db, "orders"),
      where("sellerId", "==", sellerId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map((s) => {
    const d = s.data();
    return {
      id: s.id,
      ...d,
      createdAt: toDate(d.createdAt),
      updatedAt: toDate(d.updatedAt),
    } as Order;
  });
}

export function watchOrdersBySeller(
  sellerId: string,
  cb: (orders: Order[]) => void
) {
  const q = query(
    collection(db, "orders"),
    where("sellerId", "==", sellerId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((s) => {
        const d = s.data();
        return {
          id: s.id,
          ...d,
          createdAt: toDate(d.createdAt),
          updatedAt: toDate(d.updatedAt),
        } as Order;
      })
    );
  });
}

export async function updateOrderStatus(orderId: string, status: Order["status"]) {
  return updateDoc(doc(db, "orders", orderId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/* ----------------------------- Seller applications --------------------------- */

export async function submitSellerApplication(app: Omit<SellerApplication, "createdAt" | "status">) {
  return addDoc(collection(db, "seller_applications"), {
    ...app,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function listSellerApplications(status?: SellerApplication["status"]) {
  const base = collection(db, "seller_applications");
  const q = status ? query(base, where("status", "==", status)) : query(base);
  const snap = await getDocs(q);
  return snap.docs.map((s) => {
    const d = s.data();
    return { ...(d as SellerApplication), createdAt: toDate(d.createdAt) };
  });
}

export async function decideSellerApplication(
  uid: string,
  decision: "approved" | "rejected"
) {
  const snap = await getDocs(
    query(collection(db, "seller_applications"), where("uid", "==", uid), fsLimit(1))
  );
  if (snap.empty) return;
  await updateDoc(snap.docs[0].ref, { status: decision });
  await updateDoc(doc(db, "users", uid), {
    sellerStatus: decision === "approved" ? "active" : "inactive",
  });
}

/* ----------------------------------- Admin ----------------------------------- */

export async function getAnalyticsOverview(): Promise<AnalyticsOverview | null> {
  const snap = await getDoc(doc(db, "analytics_overview", "current"));
  if (!snap.exists()) return null;
  return snap.data() as AnalyticsOverview;
}
