import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  runTransaction,
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

/* ------------------------------ Realtime watchers -------------------------- */
// The mobile app is stream-first (Firestore snapshots); these give the web the
// same live behaviour. Each returns an unsubscribe function.

const mapProducts = (docs: { id: string; data: () => unknown }[]): Product[] =>
  docs.map((s) => ({ id: s.id, ...(s.data() as Omit<Product, "id">) }));

const mapShops = (docs: { id: string; data: () => unknown }[]): Shop[] =>
  docs.map((s) => ({ shopId: s.id, ...(s.data() as Omit<Shop, "shopId">) }));

export function watchShopsBySociety(
  societyId: string,
  cb: (shops: Shop[]) => void
) {
  const q = query(
    collection(db, "shops"),
    where("societyId", "==", societyId),
    where("isActive", "==", true)
  );
  return onSnapshot(q, (snap) => cb(mapShops(snap.docs)));
}

/** Active products across the buyer's whole society — the app's Home feed. */
export function watchProductsBySociety(
  societyId: string,
  cb: (products: Product[]) => void
) {
  const q = query(
    collection(db, "products"),
    where("societyId", "==", societyId),
    where("isActive", "==", true)
  );
  return onSnapshot(q, (snap) => cb(mapProducts(snap.docs)));
}

/** Active products for one shop — the buyer's shop page. */
export function watchProductsByShop(
  shopId: string,
  cb: (products: Product[]) => void
) {
  const q = query(
    collection(db, "products"),
    where("shopId", "==", shopId),
    where("isActive", "==", true)
  );
  return onSnapshot(q, (snap) => cb(mapProducts(snap.docs)));
}

/** Watch specific product docs by id (cart stock reconciliation). Max 30 ids. */
export function watchProductsByIds(
  ids: string[],
  cb: (products: Product[]) => void
) {
  if (ids.length === 0) {
    cb([]);
    return () => {};
  }
  const q = query(
    collection(db, "products"),
    where(documentId(), "in", ids.slice(0, 30))
  );
  return onSnapshot(q, (snap) => cb(mapProducts(snap.docs)));
}

export function watchOrdersByBuyer(
  buyerId: string,
  cb: (orders: Order[]) => void
) {
  const q = query(
    collection(db, "orders"),
    where("buyerId", "==", buyerId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) =>
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
    )
  );
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

/**
 * Atomically decrement product stock for an order. Mirrors the mobile app's
 * ProductRepository.reduceStockAfterOrder — all reads first, validate, then
 * write. Throws if any item is gone or under-stocked (caller must not create
 * the order in that case).
 */
export async function reduceStockForOrder(
  items: { productId: string; quantity: number }[]
) {
  await runTransaction(db, async (tx) => {
    const refs = items.map((it) => doc(db, "products", it.productId));
    const snaps = [];
    for (const ref of refs) snaps.push(await tx.get(ref));

    const next: number[] = [];
    snaps.forEach((snap, i) => {
      if (!snap.exists()) throw new Error("An item is no longer available.");
      const data = snap.data();
      const stock = (data.quantity as number) ?? 0;
      if (stock < items[i].quantity) {
        throw new Error(`Not enough stock for ${data.name ?? "an item"}.`);
      }
      next[i] = stock - items[i].quantity;
    });

    snaps.forEach((snap, i) => tx.update(snap.ref, { quantity: next[i] }));
  });
}

/**
 * Return stock to inventory when an order is rejected. Mirrors the mobile app's
 * ProductRepository.restockAfterOrderCancel — missing products are skipped.
 */
export async function restockForOrder(
  items: { productId: string; quantity: number }[]
) {
  await runTransaction(db, async (tx) => {
    const refs = items.map((it) => doc(db, "products", it.productId));
    const snaps = [];
    for (const ref of refs) snaps.push(await tx.get(ref));

    snaps.forEach((snap, i) => {
      if (!snap.exists()) return;
      const stock = (snap.data().quantity as number) ?? 0;
      tx.update(snap.ref, { quantity: stock + items[i].quantity });
    });
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
  // Doc ID MUST be the applicant's uid: security rules and the mobile app both
  // address this collection as seller_applications/{uid}. Using addDoc() here
  // produces a random ID that the rules' `isOwner(uid)` check rejects.
  return setDoc(doc(db, "seller_applications", app.uid), {
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
  // seller_applications is keyed by uid (see submitSellerApplication).
  await updateDoc(doc(db, "seller_applications", uid), { status: decision });

  // Mirror the mobile app's approveSeller/rejectSeller exactly so the shared
  // mobile onboarding flow still works: approval must land on sellerStatus
  // "approved" (not "active") — SellerGuard.needsOnboarding and the rules'
  // shopIdSafe() guard both key off "approved".
  await updateDoc(
    doc(db, "users", uid),
    decision === "approved"
      ? { role: "seller", sellerStatus: "approved", shopId: null }
      : { sellerStatus: "rejected" }
  );
}

/* ----------------------------------- Admin ----------------------------------- */

export async function getAnalyticsOverview(): Promise<AnalyticsOverview | null> {
  const snap = await getDoc(doc(db, "analytics_overview", "current"));
  if (!snap.exists()) return null;
  return snap.data() as AnalyticsOverview;
}
