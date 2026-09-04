import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Same Firebase project used by the mqcart Flutter app (mqcart-prod).
// These values come from lib/firebase_options.dart -> web config.
// Firebase web API keys are not secret; access is enforced by Firestore/Storage
// security rules, not by hiding this key.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyBuKsvAOuFP6J3Nr5YDey78-HsoIzOh9Bc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "mqcart-prod.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "mqcart-prod",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "mqcart-prod.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID ?? "366660097336",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:366660097336:web:eccf46eaa6b0dc8d841dcd",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
