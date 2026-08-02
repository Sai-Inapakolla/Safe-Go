import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "My_Firebase_Api",
  authDomain: "My_domain",
  projectId: "safego-ph",
  storageBucket: My_Storagr",
  messagingSenderId: "ID",
  appId: "APPID",
  measurementId: "Measurement"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
