import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp, limit, writeBatch
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

const resolveRuntimeApiKey = () => {
  const candidateSources = [
    window.__RUNTIME_CONFIG,
    window.__ENV,
    window.__NETLIFY_ENV,
    window.__APP_ENV
  ];

  for (const source of candidateSources) {
    if (!source || typeof source !== 'object') continue;
    const candidate = source.VITE_FIREBASE_API_KEY || source.FIREBASE_API_KEY || source.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  const metaTag = document.querySelector('meta[name="VITE_FIREBASE_API_KEY"]');
  if (metaTag?.content?.trim()) {
    return metaTag.content.trim();
  }

  if (typeof window.__FIREBASE_API_KEY === 'string' && window.__FIREBASE_API_KEY.trim()) {
    return window.__FIREBASE_API_KEY.trim();
  }

  return null;
};

const firebaseConfig = (() => {
  const config = window.__FIREBASE_CONFIG;

  if (!config || typeof config !== 'object') {
    throw new Error('[Firebase] `window.__FIREBASE_CONFIG` tanımlı değil. `config/firebase-config.js` dosyanızın yüklendiğinden emin olun.');
  }

  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter((field) => !config[field]);

  if (missingFields.length) {
    throw new Error(`[Firebase] Eksik Firebase yapılandırma alanları: ${missingFields.join(', ')}.`);
  }

  const sanitizedConfig = { ...config };
  const runtimeApiKey = resolveRuntimeApiKey();

  if (runtimeApiKey) {
    sanitizedConfig.apiKey = runtimeApiKey;
  }

  if (!sanitizedConfig.apiKey) {
    throw new Error('[Firebase] `apiKey` yapılandırması bulunamadı. Netlify ortam değişkeni VITE_FIREBASE_API_KEY veya config/firebase-config.js dosyası üzerinden bir değer sağlayın.');
  }

  return Object.freeze(sanitizedConfig);
})();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const SESSION_STORAGE_KEY = 'quizup.activeSessionId';
let lastKnownSessionUid = null;

const readStoredSessionId = () => {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY) || null;
  } catch (err) {
    console.warn('[Firebase] Failed to read stored session id', err);
    return null;
  }
};

const writeStoredSessionId = (sessionId) => {
  try {
    if (sessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
  } catch (err) {
    console.warn('[Firebase] Failed to persist session id', err);
  }
};

const clearStoredSessionId = () => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (err) {
    console.warn('[Firebase] Failed to clear stored session id', err);
  }
};

const generateSessionId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (err) {
    console.warn('[Firebase] crypto.randomUUID failed', err);
  }
  return `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

const ensureSessionId = () => {
  const existing = readStoredSessionId();
  if (existing) return existing;
  const created = generateSessionId();
  writeStoredSessionId(created);
  return created;
};

const collectDeviceContext = () => {
  try {
    const language = navigator?.language || (Array.isArray(navigator?.languages) ? navigator.languages[0] : null);
    const timezone = (() => {
      try {
        return Intl?.DateTimeFormat()?.resolvedOptions?.().timeZone || null;
      } catch {
        return null;
      }
    })();

    return {
      userAgent: navigator?.userAgent || null,
      platform: navigator?.platform || null,
      language,
      timezone
    };
  } catch (err) {
    console.warn('[Firebase] Failed to collect device context', err);
    return {
      userAgent: null,
      platform: null,
      language: null,
      timezone: null
    };
  }
};

const ensureUserProfile = async (uid, existingProfile) => {
  if (existingProfile) return existingProfile;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn('[Firebase] Failed to fetch user profile for session registration', err);
  }
  return null;
};

const registerUserSession = async ({ user, profile } = {}) => {
  const authUser = user || auth.currentUser;
  if (!authUser || authUser.isAnonymous) {
    if (authUser?.isAnonymous) {
      clearStoredSessionId();
    }
    return null;
  }

  const sessionId = ensureSessionId();
  const userId = authUser.uid;
  lastKnownSessionUid = userId;

  const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
  const now = serverTimestamp();
  let profileData = await ensureUserProfile(userId, profile);

  const displayName = profileData?.firstName || profileData?.lastName
    ? `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim()
    : authUser.displayName || null;

  const sessionPayload = {
    sessionId,
    uid: userId,
    email: authUser.email || null,
    role: profileData?.role || null,
    company: profileData?.company || null,
    department: profileData?.department || profileData?.unit || null,
    position: profileData?.position || null,
    displayName: displayName || null,
    status: 'active',
    lastActiveAt: now,
    updatedAt: now,
    device: collectDeviceContext()
  };

  try {
    const existing = await getDoc(sessionRef);
    if (existing.exists()) {
      await setDoc(sessionRef, sessionPayload, { merge: true });
    } else {
      await setDoc(sessionRef, { ...sessionPayload, createdAt: now }, { merge: true });
    }
    writeStoredSessionId(sessionId);
  } catch (err) {
    console.warn('[Firebase] Failed to register user session', err);
    return null;
  }

  return sessionId;
};

const touchUserSession = async () => {
  const sessionId = readStoredSessionId();
  const authUser = auth.currentUser;
  if (!sessionId || !authUser || authUser.isAnonymous) return false;
  try {
    const sessionRef = doc(db, 'users', authUser.uid, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      lastActiveAt: serverTimestamp(),
      status: 'active'
    });
    return true;
  } catch (err) {
    console.warn('[Firebase] Failed to update session heartbeat', err);
    return false;
  }
};

const endActiveSession = async ({ user, userId } = {}) => {
  const sessionId = readStoredSessionId();
  if (!sessionId) {
    clearStoredSessionId();
    return false;
  }

  const uid = user?.uid || userId || auth.currentUser?.uid || lastKnownSessionUid;
  if (!uid) {
    clearStoredSessionId();
    return false;
  }

  try {
    const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
    await deleteDoc(sessionRef);
  } catch (err) {
    console.warn('[Firebase] Failed to delete session record', err);
  }

  clearStoredSessionId();
  return true;
};

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
    if (user.isAnonymous) {
      clearStoredSessionId();
    } else {
      try {
        await registerUserSession({ user });
      } catch (sessionError) {
        console.warn('[Firebase] Session registration during auth change failed', sessionError);
      }
    }

    publishAuthState(user, { markReady: true });
    const reason = user.isAnonymous ? 'anon-user' : 'existing-user';
    dispatchReady(reason);
    return;
  }

  await endActiveSession();
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
  setDoc, updateDoc, deleteDoc, serverTimestamp, limit, writeBatch,
  signInAnonymously, signInWithEmailAndPassword, onAuthStateChanged, signOut,
  ref, uploadBytes, getDownloadURL, deleteObject,
  createUserWithEmailAndPassword: firebaseCreateUserWithEmailAndPassword,
  createUserWithEmailAndPasswordAsAdmin,
  registerUserSession,
  endActiveSession,
  touchUserSession
};
