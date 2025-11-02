import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp, limit
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyBu2HRYevycC_MKLY1FlnQ1_HAH9yJ3El4",
  authDomain: "retail-quiz-4bb8c.firebaseapp.com",
  projectId: "retail-quiz-4bb8c",
  storageBucket: "retail-quiz-4bb8c.firebasestorage.app",
  messagingSenderId: "656506684656",
  appId: "1:656506684656:web:a3e97785fdbe50737f6e35",
  measurementId: "G-WMBNP0BZ27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

try {
  await signInAnonymously(auth);
} catch(e) {
  console.warn('Anonymous auth error:', e);
}

window.firebase = {
  app, auth, db, storage,
  collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp, limit,
  signInAnonymously, onAuthStateChanged, signOut,
  ref, uploadBytes, getDownloadURL, deleteObject
};

window.dispatchEvent(new Event('fb-ready'));
