/* Firebase Cloud Messaging service worker (web push).
   Runs outside the app bundle, so it loads the compat SDK from gstatic and
   uses the same public web config as src/lib/firebase.ts. */

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBuKsvAOuFP6J3Nr5YDey78-HsoIzOh9Bc",
  authDomain: "mqcart-prod.firebaseapp.com",
  projectId: "mqcart-prod",
  storageBucket: "mqcart-prod.firebasestorage.app",
  messagingSenderId: "366660097336",
  appId: "1:366660097336:web:eccf46eaa6b0dc8d841dcd",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "MQ Cart";
  self.registration.showNotification(title, {
    body: payload.notification?.body || "",
    icon: "/favicon.ico",
    data: payload.data || {},
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/seller/orders"));
});
