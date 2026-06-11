import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdiawt82hTP2Q8HvzXWzUwzE8QTNAGnSI",
  authDomain: "intergate-hotel.firebaseapp.com",
  projectId: "intergate-hotel",
  storageBucket: "intergate-hotel.firebasestorage.app",
  messagingSenderId: "488491856164",
  appId: "1:488491856164:web:ef3caa8c67c3f43bfd03b1",
  measurementId: "G-ZBK137PGVZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };