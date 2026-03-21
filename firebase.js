// =======================
// Firebase Config
// =======================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your Firebase credentials
const firebaseConfig = {
  apiKey: "AIzaSyCYFrVQ9TSvkG9xa_XTYfG8Ba8oa5WWEHM",
  authDomain: "sales-management-system-318b0.firebaseapp.com",
  projectId: "sales-management-system-318b0",
  storageBucket: "sales-management-system-318b0.firebasestorage.app",
  messagingSenderId: "66121752931",
  appId: "1:66121752931:web:f32441446ad1fe07a9b356",
  measurementId: "G-N5XBXXM5VC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore database for use in script.js
export const db = getFirestore(app);
