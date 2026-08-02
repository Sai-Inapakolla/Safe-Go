import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbjJC6zUo6cM1pB1UHikhwoQTTOG4vsQQ",
  authDomain: "safego-ph.firebaseapp.com",
  projectId: "safego-ph",
  storageBucket: "safego-ph.firebasestorage.app",
  messagingSenderId: "827629293344",
  appId: "1:827629293344:web:82b8c35766be43799b1145",
  measurementId: "G-7VN0HH9K5W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
