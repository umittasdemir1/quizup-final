import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp, limit
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
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

console.log('[Firebase] Firebase initialized');

let readyDispatched = false;
let resolveReady;
let authTimeoutId;

// Always create a fresh promise for this page lifecycle so we control the resolver
window.__firebaseReadyPromise = new Promise((resolve) => {
  resolveReady = resolve;
  window.__firebaseReadyResolve = resolve;
});

const dispatchReady = (reason = 'unknown') => {
  if (readyDispatched) return;
  readyDispatched = true;
  if (authTimeoutId) {
    clearTimeout(authTimeoutId);
    authTimeoutId = null;
  }
  console.log(`[Firebase] Dispatching fb-ready event (reason: ${reason})`);
  try {
    resolveReady?.();
  } catch (err) {
    console.warn('[Firebase] Failed to resolve ready promise', err);
  }
  window.dispatchEvent(new Event('fb-ready'));
};

// Smart anonymous auth: Wait for auth state, then sign in anonymously ONLY if no user
authTimeoutId = setTimeout(() => {
  console.warn('[Firebase] Auth state listener timed out, continuing without auth state');
  dispatchReady('timeout');
}, 4000);

onAuthStateChanged(auth, async (user) => {
  console.log('[Firebase] Auth state changed:', user?.email || user?.uid || 'null', 'isAnonymous:', user?.isAnonymous);

  try {
    // If there's already a user (logged in or anonymous), mark firebase as ready immediately
    if (user) {
      console.log('[Firebase] User exists, skipping auto anonymous auth');
      dispatchReady('existing-user');
      return;
    }

    // No user at all - sign in anonymously for data access
    console.log('[Firebase] No user found, signing in anonymously...');
    await signInAnonymously(auth);
    console.log('[Firebase] Anonymous sign-in successful');
    dispatchReady('anon-sign-in');
  } catch(e) {
    console.warn('[Firebase] Anonymous auth error:', e);
    dispatchReady('anon-error');
  }
});

window.firebase = {
  app, auth, db, storage,
  collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp, limit,
  signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut,
  ref, uploadBytes, getDownloadURL, deleteObject
};
