import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import appletConfig from "./firebase-applet-config.json";

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
// Anda dapat menyesuaikan konfigurasi Firebase di sini
// atau melalui firebase-applet-config.json jika berganti environment.

const firebaseConfig = {
  apiKey: appletConfig.apiKey || "AIzaSyCgPYS0vwkHPIgHrr7pq9YLB3XLomFN9E4",
  authDomain: appletConfig.authDomain || "sdmapanrbinfo.firebaseapp.com",
  projectId: appletConfig.projectId || "sdmapanrbinfo",
  storageBucket: appletConfig.storageBucket || "sdmapanrbinfo.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || "921851523416",
  appId: appletConfig.appId || "1:921851523416:web:35adb43fed4769ca48352d",
};

const firestoreDatabaseId =
  appletConfig.firestoreDatabaseId ||
  "ai-studio-remixpusatinform-46fee186-88a5-4814-abf8-e77cd9762854";

// ==========================================
// FIREBASE INITIALIZATION
// ==========================================

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider, firebaseConfig, firestoreDatabaseId };
