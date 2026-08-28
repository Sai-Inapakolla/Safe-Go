import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBbjJC6zUo6cM1pB1UHikhwoQTTOG4vsQQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "safego-ph.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "safego-ph",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "safego-ph.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "827629293344",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:827629293344:web:82b8c35766be43799b1145",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-7VN0HH9K5W"
};

// Initialize Firebase safely to prevent duplicate initialization errors
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

