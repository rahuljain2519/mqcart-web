import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  writeBatch,
  runTransaction,
  query,
  where,
  orderBy,
  limit as fsLimit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "./firebase";
import type {
  AppUser,
  Society,
  Shop,
  Product,
  Order,
  OrderItem,
  SellerApplication,
  SellerPlan,
  SellerSubscription,
  DeliveryUnit,
  AnalyticsOverview,
} from "@/types";

export function toMinutes(value: number, unit: DeliveryUnit): number {
  if (unit === "minutes") return value;
  if (unit === "hours") return value * 60;
  return value * 1440; // days
}

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

export function watchShopById(shopId: string, cb: (shop: Shop | null) => void) {
  return onSnapshot(doc(db, "shops", shopId), (snap) =>
    cb(snap.exists() ? ({ shopId, ...snap.data() } as Shop) : null)
  );
}

/**
 * Create a seller's shop (idempotent — reuses an existing one). Always starts
 * inactive; activation is gated on a plan. Mirrors the app's ShopRemoteDS.createShop.
 */
export async function createShop(input: {
  sellerId: string;
  societyId: string;
  shopName: string;
  deliveryUnit: DeliveryUnit;
  deliveryMinValue: number;
  deliveryMaxValue: number;
  logoUrl?: string;
  bannerUrl?: string;
}): Promise<string> {
  const existing = await getShopBySeller(input.sellerId);
  const payload = {
    sellerId: input.sellerId,
    societyId: input.societyId,
    shopName: input.shopName.trim(),
    description: "",
    logoUrl: input.logoUrl ?? "",
    bannerUrl: input.bannerUrl ?? "",
    address: "",
    phone: "",
    plan: "free",
    productLimit: 10,
    productCount: existing?.productCount ?? 0,
    transactionFeePercent: 0,
    isActive: false,
    activationStatus: "pending",
    isVerified: false,
    deliveryUnit: input.deliveryUnit,
    deliveryMinValue: input.deliveryMinValue,
    deliveryMaxValue: input.deliveryMaxValue,
    deliveryMinMinutes: toMinutes(input.deliveryMinValue, input.deliveryUnit),
    deliveryMaxMinutes: toMinutes(input.deliveryMaxValue, input.deliveryUnit),
    updatedAt: serverTimestamp(),
  };
  if (existing) {
    await updateDoc(doc(db, "shops", existing.shopId), payload);
    return existing.shopId;
  }
  const r = await addDoc(collection(db, "shops"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return r.id;
}

export async function updateShop(shopId: string, patch: Partial<Shop>) {
  return updateDoc(doc(db, "shops", shopId), { ...patch, updatedAt: serverTimestamp() });
}

/** Link the shop to the user doc (one-time, allowed by rules for approved sellers). */
export async function linkShopToUser(uid: string, shopId: string) {
  return updateDoc(doc(db, "users", uid), { shopId, updatedAt: serverTimestamp() });
}

/* ---------------------------- Seller plans / activation -------------------- */

export async function getSellerPlans(): Promise<SellerPlan[]> {
  const snap = await getDoc(doc(db, "platform_config", "seller_plans"));
  if (!snap.exists()) return [];
  const data = snap.data();
  const order = ["free", "basic", "pro", "elite"];
  return Object.entries(data)
    .filter(([, v]) => v && typeof v === "object" && "monthlyFee" in v)
    .map(([key, v]) => {
      const plan = v as Record<string, unknown>;
      return {
        key,
        name: (plan.name as string) ?? key,
        monthlyFee: Number(plan.monthlyFee ?? 0),
        productLimit: Number(plan.productLimit ?? 0),
        validityDays: (plan.validityDays as number | null | undefined) ?? null,
      };
    })
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

export async function getSellerSubscription(
  sellerId: string
): Promise<SellerSubscription | null> {
  const snap = await getDoc(doc(db, "seller_subscriptions", sellerId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    sellerId,
    shopId: d.shopId ?? "",
    currentPlan: d.currentPlan ?? "free",
    status: d.status ?? "inactive",
    productLimit: Number(d.productLimit ?? 0),
    freePlanUsed: d.freePlanUsed === true,
    expiresAt: toDate(d.expiresAt),
  };
}

/**
 * Activate/upgrade a shop to a plan and enforce its product limit by disabling
 * the oldest products beyond the limit. Mirrors ShopRepository.activateShop.
 */
export async function activateShopPlan(input: {
  shopId: string;
  plan: string;
  productLimit: number;
}) {
  const batch = writeBatch(db);
  batch.update(doc(db, "shops", input.shopId), {
    isActive: true,
    activationStatus: "active",
    planStatus: "active",
    plan: input.plan,
    productLimit: input.productLimit,
    planActivatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const active = await getDocs(
    query(
      collection(db, "products"),
      where("shopId", "==", input.shopId),
      where("isActive", "==", true),
      orderBy("createdAt")
    )
  );
  active.docs.forEach((d, i) => {
    if (i >= input.productLimit) batch.update(d.ref, { isActive: false });
  });

  await batch.commit();
}

/** Activate the free plan directly (no payment), mirroring the app. */
export async function activateFreePlan(input: {
  sellerId: string;
  shopId: string;
  plan: SellerPlan;
}) {
  const expiresAt = input.plan.validityDays
    ? Timestamp.fromDate(
        new Date(Date.now() + input.plan.validityDays * 86400000)
      )
    : null;

  await setDoc(
    doc(db, "seller_subscriptions", input.sellerId),
    {
      sellerId: input.sellerId,
      shopId: input.shopId,
      currentPlan: input.plan.key,
      status: "active",
      productLimit: input.plan.productLimit,
      startedAt: serverTimestamp(),
      expiresAt,
      autoRenew: false,
      freePlanUsed: true,
      lastPaymentId: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await activateShopPlan({
    shopId: input.shopId,
    plan: input.plan.key,
    productLimit: input.plan.productLimit,
  });
}

/** STEP 1 of paid activation: create the source-of-truth payment record. */
export async function createActivationPayment(input: {
  sellerId: string;
  shopId: string;
  plan: string;
  monthlyFee: number;
  productLimit: number;
}): Promise<string> {
  const r = doc(collection(db, "seller_activation_payments"));
  await setDoc(r, {
    sellerId: input.sellerId,
    shopId: input.shopId,
    plan: input.plan,
    monthlyFee: input.monthlyFee,
    productLimit: input.productLimit,
    gateway: "razorpay",
    status: "initiated",
    createdAt: serverTimestamp(),
  });
  return r.id;
}

export async function markActivationPaymentFailed(
  paymentDocId: string,
  reason: string
) {
  return updateDoc(doc(db, "seller_activation_payments", paymentDocId), {
    status: "failed",
    failureReason: reason,
    failedAt: serverTimestamp(),
  });
}

/** STEP 2 of paid activation: ask the backend to create the Razorpay order. */
export async function createSellerRazorpayOrder(
  paymentDocId: string
): Promise<string> {
  const fn = httpsCallable<{ paymentDocId: string }, { orderId: string }>(
    functions,
    "createSellerOrder"
  );
  const res = await fn({ paymentDocId });
  return res.data.orderId;
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

/** Throws if the shop is already at its plan's product limit (mirrors the app). */
export async function validateProductLimit(shopId: string) {
  const snap = await getDoc(doc(db, "shops", shopId));
  if (!snap.exists()) throw new Error("Shop not found.");
  const d = snap.data();
  const count = Number(d.productCount ?? 0);
  const limit = Number(d.productLimit ?? 10);
  if (count >= limit) {
    throw new Error(
      `You've reached your plan's limit of ${limit} products. Upgrade to add more.`
    );
  }
}

/** Create a product with limit check + productCount bump, like ProductRepository.createProduct. */
export async function createSellerProduct(product: Omit<Product, "id">) {
  await validateProductLimit(product.shopId);
  const r = await addDoc(collection(db, "products"), {
    ...product,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "shops", product.shopId), {
    productCount: increment(1),
  });
  return r;
}

export async function deleteSellerProduct(productId: string, shopId: string) {
  await deleteDoc(doc(db, "products", productId));
  await updateDoc(doc(db, "shops", shopId), { productCount: increment(-1) });
}

export function watchProductsByShopAll(
  shopId: string,
  cb: (products: Product[]) => void
) {
  // Seller view — includes inactive/hidden products.
  const q = query(collection(db, "products"), where("shopId", "==", shopId));
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((s) => ({ id: s.id, ...(s.data() as Omit<Product, "id">) })))
  );
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

export function watchMyApplication(
  uid: string,
  cb: (app: SellerApplication | null) => void
) {
  return onSnapshot(doc(db, "seller_applications", uid), (snap) =>
    cb(
      snap.exists()
        ? ({ ...(snap.data() as SellerApplication), createdAt: toDate(snap.data().createdAt) })
        : null
    )
  );
}

/* ----------------------------------- Admin ----------------------------------- */

export async function getAnalyticsOverview(): Promise<AnalyticsOverview | null> {
  const snap = await getDoc(doc(db, "analytics_overview", "current"));
  if (!snap.exists()) return null;
  return snap.data() as AnalyticsOverview;
}

export function watchAnalyticsOverview(cb: (o: AnalyticsOverview | null) => void) {
  return onSnapshot(doc(db, "analytics_overview", "current"), (snap) =>
    cb(snap.exists() ? (snap.data() as AnalyticsOverview) : null)
  );
}

/* --- Societies (admin) --- */

export async function listAllSocieties(): Promise<Society[]> {
  const snap = await getDocs(collection(db, "societies"));
  return snap.docs.map((s) => ({ id: s.id, ...(s.data() as Omit<Society, "id">) }));
}

export async function createSociety(name: string, city: string) {
  return addDoc(collection(db, "societies"), {
    name: name.trim(),
    city: city.trim(),
    isActive: true,
    createdAt: serverTimestamp(),
  });
}

export async function deleteSociety(societyId: string) {
  return deleteDoc(doc(db, "societies", societyId));
}

/* --- Users / sellers (admin) --- */

export async function listUsersByRole(role: string): Promise<AppUser[]> {
  const snap = await getDocs(
    query(collection(db, "users"), where("role", "==", role))
  );
  return snap.docs.map((s) => {
    const d = s.data();
    return {
      uid: s.id,
      name: d.name ?? "",
      phone: d.phone ?? "",
      role: d.role ?? "buyer",
      societyId: d.societyId ?? "",
      flatNumber: d.flatNumber ?? "",
      sellerStatus: d.sellerStatus ?? "none",
      shopId: d.shopId ?? null,
    };
  });
}

export async function adminUpdateUser(
  uid: string,
  patch: { role?: string; societyId?: string }
) {
  return updateDoc(doc(db, "users", uid), { ...patch, updatedAt: serverTimestamp() });
}

/** Toggle a shop active/inactive and cascade to all its products (admin). */
export async function toggleShopActive(shopId: string, makeActive: boolean) {
  const batch = writeBatch(db);
  batch.update(doc(db, "shops", shopId), {
    isActive: makeActive,
    activationStatus: makeActive ? "active" : "inactive",
    updatedAt: serverTimestamp(),
  });
  const products = await getDocs(
    query(collection(db, "products"), where("shopId", "==", shopId))
  );
  products.docs.forEach((d) => batch.update(d.ref, { isActive: makeActive }));
  await batch.commit();
}

export async function getSellerApplication(
  uid: string
): Promise<SellerApplication | null> {
  const snap = await getDoc(doc(db, "seller_applications", uid));
  if (!snap.exists()) return null;
  return { ...(snap.data() as SellerApplication), createdAt: toDate(snap.data().createdAt) };
}
