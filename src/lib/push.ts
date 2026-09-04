import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { app, db } from "./firebase";

// Web Push certificate key pair (public). Generate at:
// Firebase Console -> Project settings -> Cloud Messaging -> Web Push certificates.
// Set it as NEXT_PUBLIC_FIREBASE_VAPID_KEY for App Hosting, or paste below.
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

let registered = false;

/**
 * Register this browser for new-order push notifications. No-op if the browser
 * doesn't support FCM, permission is denied, or the VAPID key isn't configured.
 * The token is written to users/{uid} as both the legacy `fcmToken` (so the
 * current Cloud Function keeps working) and `fcmTokens[token] = "web"`.
 */
export async function registerSellerPush(uid: string): Promise<void> {
  if (registered || typeof window === "undefined" || !VAPID_KEY) return;
  if (!(await isSupported().catch(() => false))) return;

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") return;

  const swReg = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );

  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg,
  }).catch(() => null);
  if (!token) return;

  await updateDoc(doc(db, "users", uid), {
    fcmToken: token,
    [`fcmTokens.${token}`]: "web",
  }).catch(() => {});

  registered = true;
}
