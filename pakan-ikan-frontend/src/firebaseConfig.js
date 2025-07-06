// src/firebaseConfig.js

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Konfigurasi ini menghubungkan aplikasi web Anda ke proyek Firebase "kolam-cerdas"
const firebaseConfig = {
  apiKey: "AIzaSyCzpU35r1Fr94NcEEqNRooWpJoyMSdy1hg",
  authDomain: "kolam-cerdas-4ba14.firebaseapp.com",
  projectId: "kolam-cerdas-4ba14",
  storageBucket: "kolam-cerdas-4ba14.firebasestorage.app",
  messagingSenderId: "688506779133",
  appId: "1:688506779133:web:b893ed570f3ed001bb9594" 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

export { firestore, auth };