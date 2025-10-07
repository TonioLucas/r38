"use client";

import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import {
  getFunctions,
  Functions,
  connectFunctionsEmulator,
} from "firebase/functions";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics } from "firebase/analytics";
import { FIREBASE_CONFIG } from "@/config";
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectStorageEmulator } from "firebase/storage";

// Initialize Firebase only if config is available
let firebaseApp: FirebaseApp | undefined;

if (FIREBASE_CONFIG.apiKey) {
  firebaseApp = initializeApp(FIREBASE_CONFIG);
}

// Firebase services (only initialize if app exists)
export const auth = firebaseApp ? getAuth(firebaseApp) : ({} as Auth);
export const db = firebaseApp ? getFirestore(firebaseApp) : ({} as Firestore);
export const storage = firebaseApp
  ? getStorage(firebaseApp)
  : ({} as FirebaseStorage);
export const functions = firebaseApp
  ? getFunctions(firebaseApp)
  : ({} as Functions);

// Analytics (client-side only)
export let analytics: Analytics | undefined = undefined;
if (typeof window !== "undefined" && firebaseApp) {
  analytics = getAnalytics(firebaseApp);
}

// Development environment emulators (optional)
// Only connect to emulators if explicitly enabled via environment variable
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

if (useEmulators && process.env.NODE_ENV === "development") {
  console.log(
    "🔧 Using Firebase emulators (local development mode)"
  );
  console.log("   - Functions: localhost:5001");
  console.log("   - Auth: localhost:9099");
  console.log("   - Firestore: localhost:8080");
  console.log("   - Storage: localhost:9199");
  connectFunctionsEmulator(functions, "localhost", 5001);
  connectAuthEmulator(auth, "http://localhost:9099/");
  connectFirestoreEmulator(db, "localhost", 8080);
  connectStorageEmulator(storage, "localhost", 9199);
} else if (process.env.NODE_ENV === "development") {
  console.log("🔥 Connected to PRODUCTION Firebase (local dev with production DB)");
}
