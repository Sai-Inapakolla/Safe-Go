import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-safego.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-safego",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-safego.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:demo000000000000",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Initialize Firebase safely with mock resilience for CI and test environments
let app: any;
let auth: any;
let db: any;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp({ apiKey: "demo-api-key", projectId: "demo-safego" });
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (_) {
    auth = { currentUser: null, onAuthStateChanged: () => () => {}, signOut: async () => {} };
    db = {};
  }
}

export { auth, db };
export default app;

