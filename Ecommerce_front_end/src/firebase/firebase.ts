import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC-bhe6ios5m5oniTRs8XWBXdWjDVER9vw",
  authDomain: "ecommerce-30f33.firebaseapp.com",
  projectId: "ecommerce-30f33",
  storageBucket: "ecommerce-30f33.firebasestorage.app",
  messagingSenderId: "567151533622",
  appId: "1:567151533622:web:a163e1addcd15820204297",
  measurementId: "G-FF7HYY3G6F"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider(); 