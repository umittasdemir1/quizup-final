import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp, limit
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  deleteUser,
  fetchSignInMethodsForEmail,
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
let secondaryAppInstance;
let secondaryAuthInstance;

let resolveAuthReady;
let authReadyResolved = false;

window.__firebaseAuthReady = false;
window.__firebaseCurrentUser = null;
window.__firebaseAuthReadyPromise = new Promise((resolve) => {
  resolveAuthReady = resolve;
});

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

const publishAuthState = (user, { markReady = false } = {}) => {
  window.__firebaseCurrentUser = user || null;
  if (markReady && !authReadyResolved) {
    authReadyResolved = true;
    window.__firebaseAuthReady = true;
    try {
      resolveAuthReady?.(window.__firebaseCurrentUser);
    } catch (err) {
      console.warn('[Firebase] Failed to resolve auth ready promise', err);
    }
    resolveAuthReady = null;
  }

  if (markReady || authReadyResolved) {
    window.__firebaseAuthReady = true;
  }

  try {
    window.dispatchEvent(new CustomEvent('fb-auth-state', {
      detail: {
        user: window.__firebaseCurrentUser,
        ready: window.__firebaseAuthReady
      }
    }));
  } catch (err) {
    console.warn('[Firebase] Failed to dispatch fb-auth-state event', err);
  }
};

const getSecondaryAuthInstance = () => {
  if (!secondaryAppInstance) {
    secondaryAppInstance = initializeApp(firebaseConfig, 'secondary');
  }
  if (!secondaryAuthInstance) {
    secondaryAuthInstance = getAuth(secondaryAppInstance);
  }
  return secondaryAuthInstance;
};

const ensureSecondarySignedOut = async () => {
  if (!secondaryAuthInstance) return;
  try {
    if (secondaryAuthInstance.currentUser) {
      await signOut(secondaryAuthInstance);
    }
  } catch (signOutError) {
    console.warn('[Firebase] Secondary auth pre-clean sign-out failed', signOutError);
  }
};

const createUserWithEmailAndPasswordAsAdmin = async (email, password) => {
  const adminAuth = auth;
  const adminUser = adminAuth.currentUser;

  if (!adminUser) {
    const error = new Error('Yönetici oturumu bulunamadı');
    error.code = 'auth/admin-required';
    throw error;
  }

  const normalizedEmail = email?.trim().toLowerCase();
  const secondaryAuth = getSecondaryAuthInstance();

  await ensureSecondarySignedOut();

  let credential;

  try {
    if (normalizedEmail) {
      try {
        const existingProviders = await fetchSignInMethodsForEmail(secondaryAuth, normalizedEmail);
        if (existingProviders?.length) {
          const dupError = new Error('Bu email adresi zaten kayıtlı');
          dupError.code = 'auth/email-already-in-use';
          throw dupError;
        }
      } catch (methodErr) {
        // fetchSignInMethodsForEmail returns auth/user-not-found when email yok - ignore
        if (methodErr.code && methodErr.code !== 'auth/user-not-found') {
          console.warn('[Firebase] fetchSignInMethodsForEmail failed', methodErr);
        }
      }
    }

    credential = await firebaseCreateUserWithEmailAndPassword(
      secondaryAuth,
      normalizedEmail || email,
      password
    );

    try {
      await adminUser.reload?.();
    } catch (reloadError) {
      console.warn('[Firebase] Admin reload failed after user creation', reloadError);
    }

    const createdUser = credential.user;

    return {
      user: createdUser,
      async finalize() {
        await ensureSecondarySignedOut();
      },
      async rollback() {
        try {
          if (createdUser) {
            await deleteUser(createdUser);
          }
        } catch (deleteError) {
          console.warn('[Firebase] Yeni oluşturulan kullanıcı silinemedi', deleteError);
        } finally {
          await ensureSecondarySignedOut();
        }
      }
    };
  } catch (err) {
    await ensureSecondarySignedOut();
    throw err;
  }
};

// Smart anonymous auth: Wait for auth state, then sign in anonymously ONLY if no user
authTimeoutId = setTimeout(() => {
  console.warn('[Firebase] Auth state listener timed out, continuing without auth state');
  dispatchReady('timeout');
}, 4000);

onAuthStateChanged(auth, async (user) => {
  console.log('[Firebase] Auth state changed:', user?.email || user?.uid || 'null', 'isAnonymous:', user?.isAnonymous);

  if (user) {
    publishAuthState(user, { markReady: true });
    const reason = user.isAnonymous ? 'anon-user' : 'existing-user';
    dispatchReady(reason);
    return;
  }

  publishAuthState(null);

  try {
    console.log('[Firebase] No user found, signing in anonymously...');
    await signInAnonymously(auth);
    console.log('[Firebase] Anonymous sign-in successful');
    // onAuthStateChanged will fire again with the anonymous user
  } catch (e) {
    console.warn('[Firebase] Anonymous auth error:', e);
    publishAuthState(null, { markReady: true });
    dispatchReady('anon-error');
  }
});

window.firebase = {
  app, auth, db, storage,
  collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp, limit,
  signInAnonymously, signInWithEmailAndPassword, onAuthStateChanged, signOut,
  ref, uploadBytes, getDownloadURL, deleteObject,
  createUserWithEmailAndPassword: firebaseCreateUserWithEmailAndPassword,
  createUserWithEmailAndPasswordAsAdmin
};
