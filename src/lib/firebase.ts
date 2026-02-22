import { initializeApp, FirebaseApp } from "firebase/app";
// Use firestore/lite (REST-only, no WebChannel) to avoid 400 errors on the
// Listen stream that break getDoc() in Firebase SDK v12 on Firebase Hosting.
// All operations in this app are one-time reads/writes — no onSnapshot needed.
import { getFirestore, Firestore } from "firebase/firestore/lite";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC-NdHcxd5xfyFmp3r4sxMcH-FmM6aA3ms",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bot-commercial-dd165.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bot-commercial-dd165",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bot-commercial-dd165.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "819641574445",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:819641574445:web:19a734a7f65f33caabc4a4",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-BHME6F9GB1"
};

const DATABASE_ID = import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)";

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let isConfigured = false;

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
  try {
    console.log('[Firebase] Initializing app with projectId:', firebaseConfig.projectId, '| databaseId:', DATABASE_ID);
    app = initializeApp(firebaseConfig);

    db = getFirestore(app, DATABASE_ID);

    auth = getAuth(app);
    storage = getStorage(app);
    isConfigured = true;
    console.log('[Firebase] Initialization successful');
  } catch (error) {
    console.error("[Firebase] Initialization failed:", error);
  }
} else {
  console.warn("[Firebase] API Key is missing. Please check your environment variables.");
}

export { app, db, auth, storage, isConfigured };
