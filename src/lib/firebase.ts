// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Working Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBnXDHoF4dIskk2bRa2b7CmGuAKwRFNuDE",
    authDomain: "pawscript-web-portal.firebaseapp.com",
    projectId: "pawscript-web-portal",
    storageBucket: "pawscript-web-portal.firebasestorage.app",
    messagingSenderId: "182936631452",
    appId: "1:182936631452:web:6efe0cd9f0989a2a72d559",
    measurementId: "G-WEBKPCFKP3"
};

console.log('🔥 Using working Firebase config');

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;