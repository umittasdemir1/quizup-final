import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp, limit, writeBatch, deleteField
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  deleteUser,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js';

// 🔧 Local dev logging - helpers.js henüz yüklenmemiş olabilir
const safeDevLog = (...args) => {
  if (typeof window !== 'undefined' && window.devLog) {
    window.devLog(...args);
  } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log(...args);
  }
};

const safeDevWarn = (...args) => {
  if (typeof window !== 'undefined' && window.devWarn) {
    window.devWarn(...args);
  } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.warn(...args);
  }
};

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
const functions = getFunctions(app);

safeDevLog('[Firebase] Firebase initialized');

let readyDispatched = false;
let resolveReady;
let authTimeoutId;
let secondaryAppInstance;
let secondaryAuthInstance;
let userSessionUnsubscribe;
let forcedLogoutInProgress = false;
let sessionRegistered = false;

let resolveAuthReady;
let authReadyResolved = false;

let sessionSyncGraceUntil = 0;

const startSessionSyncGracePeriod = (durationMs = 8000) => {
  const now = Date.now();
  sessionSyncGraceUntil = now + Math.max(0, durationMs);
  if (typeof window !== 'undefined') {
    window.__sessionSyncGraceUntil = sessionSyncGraceUntil;
  }
};

const isSessionSyncGracePeriodActive = () => {
  if (!sessionSyncGraceUntil) return false;
  return Date.now() < sessionSyncGraceUntil;
};

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
  safeDevLog(`[Firebase] Dispatching fb-ready event (reason: ${reason})`);
  try {
    resolveReady?.();
  } catch (err) {
    safeDevWarn('[Firebase] Failed to resolve ready promise', err);
  }
  window.dispatchEvent(new Event('fb-ready'));
};

const SESSION_ID_STORAGE_KEY = 'quizup:session:id';
const SESSION_ISSUED_STORAGE_KEY = 'quizup:session:issuedAt';

const readStoredSessionId = () => {
  try {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(SESSION_ID_STORAGE_KEY)
      : null;
  } catch (err) {
    safeDevWarn('[Firebase] Local session id okunamadı:', err);
    return null;
  }
};

const evaluateSessionRegistrationNeed = (userId, userData) => {
  const result = {
    needsRegistration: false,
    reason: null,
    storedSessionId: null,
    hasStoredSession: false,
    activeSessionKeys: []
  };

  if (!userId) {
    return result;
  }

  const storedSessionId = readStoredSessionId();
  result.storedSessionId = storedSessionId;
  result.hasStoredSession = Boolean(storedSessionId);

  const activeSessions = userData?.activeSessions && typeof userData.activeSessions === 'object'
    ? userData.activeSessions
    : null;

  if (activeSessions) {
    try {
      result.activeSessionKeys = Object.keys(activeSessions);
    } catch (err) {
      safeDevWarn('[Firebase] Aktif oturum anahtarları okunamadı:', err);
    }
  }

  if (!storedSessionId) {
    result.needsRegistration = true;
    result.reason = 'no-local-session';
    return result;
  }

  if (!activeSessions || !activeSessions[storedSessionId]) {
    result.needsRegistration = true;
    result.reason = activeSessions ? 'local-session-not-in-firestore' : 'no-active-sessions';
    return result;
  }

  return result;
};

const enqueueSessionRegistration = (payload) => {
  if (typeof window === 'undefined' || !payload?.userId) {
    return;
  }

  if (!Array.isArray(window.__pendingSessionRegistrations)) {
    window.__pendingSessionRegistrations = [];
  }

  if (!window.__pendingSessionRegistrationUsers || typeof window.__pendingSessionRegistrationUsers !== 'object') {
    window.__pendingSessionRegistrationUsers = {};
  }

  if (window.__pendingSessionRegistrationUsers[payload.userId]) {
    return;
  }

  window.__pendingSessionRegistrationUsers[payload.userId] = true;
  window.__pendingSessionRegistrations.push({
    ...payload,
    requestedAt: payload.requestedAt || Date.now()
  });

  try {
    window.dispatchEvent(new CustomEvent('firebase-register-session', { detail: payload }));
  } catch (err) {
    safeDevWarn('[Firebase] Session register event gönderilemedi:', err);
  }
};

const requestActiveSessionRegistration = async (payload) => {
  if (!payload?.userId) {
    return;
  }

  if (typeof window !== 'undefined' && typeof window.registerActiveSession === 'function') {
    try {
      const result = await window.registerActiveSession(payload.userId);
      if (result) {
        if (window.__pendingSessionRegistrationUsers) {
          delete window.__pendingSessionRegistrationUsers[payload.userId];
        }
        return;
      }
      payload.lastError = 'register-returned-null';
    } catch (err) {
      payload.lastError = err?.message || String(err);
      safeDevWarn('[Firebase] registerActiveSession anlık çağrısı başarısız:', err);
    }
  }

  enqueueSessionRegistration(payload);
};

const ensureUserProfileCached = async (authUser) => {
  if (!authUser) {
    return null;
  }

  const userRef = doc(db, 'users', authUser.uid);
  let snapshot;
  let userData = {};
  let exists = false;

  try {
    snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      exists = true;
      userData = snapshot.data() || {};
    }
  } catch (err) {
    safeDevWarn('[Firebase] Kullanıcı belgesi okunamadı:', err);
  }

  if (!userData || typeof userData !== 'object') {
    userData = {};
  }

  let applicationPin = userData.applicationPin;

  if (!applicationPin || !/^\d{4}$/.test(applicationPin)) {
    applicationPin = '0000';
    try {
      await updateDoc(userRef, { applicationPin });
    } catch (pinError) {
      safeDevWarn('[Firebase] Varsayılan uygulama PIN güncellenemedi:', pinError);
    }
  }

  const normalizedData = {
    ...userData,
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    company: userData.company || '',
    department: userData.department || '',
    position: userData.position || '',
    applicationPin,
    // Preserve super admin flag
    isSuperAdmin: userData.isSuperAdmin === true ? true : undefined
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify({
        uid: authUser.uid,
        email: authUser.email || '',
        ...normalizedData
      }));
    }
  } catch (storageErr) {
    safeDevWarn('[Firebase] Kullanıcı bilgileri yerel olarak saklanamadı:', storageErr);
  }

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('user-info-updated'));
    }
  } catch (eventErr) {
    safeDevWarn('[Firebase] user-info-updated olayı gönderilemedi:', eventErr);
  }

  return {
    userRef,
    rawData: userData,
    normalizedData,
    exists
  };
};

const detachUserSessionListener = () => {
  try {
    userSessionUnsubscribe?.();
  } catch (err) {
    safeDevWarn('[Firebase] Failed to detach user session listener', err);
  }
  userSessionUnsubscribe = null;
};

const triggerForcedLogout = (detail) => {
  if (forcedLogoutInProgress) return;
  forcedLogoutInProgress = true;

  const payload = {
    reason: detail?.reason || 'unknown',
    message: detail?.message || 'Güvenlik nedeniyle oturumunuz kapatıldı.',
    kind: detail?.kind || 'warning',
    redirect: detail?.redirect || '#/login'
  };

  try {
    window.dispatchEvent(new CustomEvent('firebase-force-logout', { detail: payload }));
  } catch (err) {
    safeDevWarn('[Firebase] Force logout event failed, falling back', err);
    try {
      localStorage.removeItem('currentUser');
      localStorage.removeItem(SESSION_ID_STORAGE_KEY);
      localStorage.removeItem(SESSION_ISSUED_STORAGE_KEY);
    } catch (storageErr) {
      safeDevWarn('[Firebase] Force logout storage cleanup failed', storageErr);
    }
    signOut(auth).catch((signOutErr) => {
      safeDevWarn('[Firebase] Force sign-out fallback failed', signOutErr);
    });
  }
};

const publishAuthState = (user, { markReady = false } = {}) => {
  window.__firebaseCurrentUser = user || null;
  if (markReady && !authReadyResolved) {
    authReadyResolved = true;
    window.__firebaseAuthReady = true;
    try {
      resolveAuthReady?.(window.__firebaseCurrentUser);
    } catch (err) {
      safeDevWarn('[Firebase] Failed to resolve auth ready promise', err);
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
    safeDevWarn('[Firebase] Failed to dispatch fb-auth-state event', err);
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
    safeDevWarn('[Firebase] Secondary auth pre-clean sign-out failed', signOutError);
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
          safeDevWarn('[Firebase] fetchSignInMethodsForEmail failed', methodErr);
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
      safeDevWarn('[Firebase] Admin reload failed after user creation', reloadError);
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
          safeDevWarn('[Firebase] Yeni oluşturulan kullanıcı silinemedi', deleteError);
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
  safeDevWarn('[Firebase] Auth state listener timed out, continuing without auth state');
  dispatchReady('timeout');
}, 4000);

onAuthStateChanged(auth, async (user) => {
  safeDevLog('[Firebase] Auth state changed:', user?.email || user?.uid || 'null', 'isAnonymous:', user?.isAnonymous);

  if (!user || user.isAnonymous) {
    sessionRegistered = false;
  }

  if (user) {
    publishAuthState(user, { markReady: true });
    const reason = user.isAnonymous ? 'anon-user' : 'existing-user';
    dispatchReady(reason);

    if (user.isAnonymous) {
      detachUserSessionListener();
      forcedLogoutInProgress = false;
      return;
    }

    forcedLogoutInProgress = false;

    detachUserSessionListener();

    let cachedProfile = null;

    try {
      cachedProfile = await ensureUserProfileCached(user);
    } catch (profileErr) {
      safeDevWarn('[Firebase] Kullanıcı profili önbelleğe alınamadı:', profileErr);
    }

    if (!sessionRegistered) {
      sessionRegistered = true;
      try {
        if (typeof window !== 'undefined' && typeof window.registerActiveSession === 'function') {
          const registrationResult = await window.registerActiveSession(user.uid);
          if (!registrationResult) {
            sessionRegistered = false;
          }
        } else {
          safeDevWarn('[Firebase] registerActiveSession fonksiyonu bulunamadı');
          sessionRegistered = false;
        }
      } catch (registrationErr) {
        sessionRegistered = false;
        safeDevWarn('[Firebase] Oturum kaydı tamamlanamadı:', registrationErr);
      }
    }

    startSessionSyncGracePeriod();

    try {
      const userRef = cachedProfile?.userRef || doc(db, 'users', user.uid);
      userSessionUnsubscribe = onSnapshot(userRef, (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const data = snapshot.data() || {};

        if (window.__manualLogoutInProgress) {
          return;
        }

        let localSessionId = null;
        let localIssuedAt = 0;

        try {
          localSessionId = localStorage.getItem(SESSION_ID_STORAGE_KEY);
        } catch (err) {
          safeDevWarn('[Firebase] Unable to read local session id', err);
        }

        try {
          const issuedRaw = localStorage.getItem(SESSION_ISSUED_STORAGE_KEY);
          localIssuedAt = issuedRaw ? Number(issuedRaw) : 0;
        } catch (err) {
          safeDevWarn('[Firebase] Unable to read local session timestamp', err);
        }

        if (!forcedLogoutInProgress) {
          let invalidationMs = 0;
          const invalidationValue = data.sessionInvalidationAt;
          if (invalidationValue?.toMillis) {
            invalidationMs = invalidationValue.toMillis();
          } else if (typeof invalidationValue === 'number') {
            invalidationMs = invalidationValue;
          }

          if (invalidationMs && localIssuedAt && invalidationMs >= localIssuedAt) {
            triggerForcedLogout({
              reason: 'session-invalidated',
              message: 'Tüm cihazlarda oturum kapatma işlemi nedeniyle çıkış yaptınız.',
              kind: 'warning'
            });
            return;
          }
        }

        if (!forcedLogoutInProgress && localSessionId) {
          if (isSessionSyncGracePeriodActive()) {
            return;
          }

          const activeSessions = data.activeSessions && typeof data.activeSessions === 'object'
            ? data.activeSessions
            : {};

          if (localSessionId && !activeSessions[localSessionId]) {
            triggerForcedLogout({
              reason: 'session-removed',
              message: 'Oturumunuz başka bir cihazdan kapatıldı.',
              kind: 'warning'
            });
          }
        }
      }, (error) => {
        safeDevWarn('[Firebase] User session listener error', error);
        if (error?.code === 'permission-denied' || /insufficient permissions/i.test(error?.message || '')) {
          detachUserSessionListener();
        }
      });
    } catch (listenerError) {
      safeDevWarn('[Firebase] Failed to attach user session listener', listenerError);
    }

    return;
  }

  detachUserSessionListener();
  forcedLogoutInProgress = false;

  publishAuthState(null);

  try {
    safeDevLog('[Firebase] No user found, signing in anonymously...');
    await signInAnonymously(auth);
    safeDevLog('[Firebase] Anonymous sign-in successful');
    // onAuthStateChanged will fire again with the anonymous user
  } catch (e) {
    safeDevWarn('[Firebase] Anonymous auth error:', e);
    publishAuthState(null, { markReady: true });
    dispatchReady('anon-error');
  }
});

// Cloud Function to delete user from Auth (requires admin role)
const deleteUserByAdmin = async (userId) => {
  const deleteUserFunction = httpsCallable(functions, 'deleteUserByAdmin');
  const result = await deleteUserFunction({ userId });
  return result.data;
};

window.firebase = {
  app, auth, db, storage, functions,
  collection, addDoc, onSnapshot, query, where, orderBy, doc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, serverTimestamp, limit, writeBatch, deleteField,
  signInAnonymously, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  ref, uploadBytes, getDownloadURL, deleteObject,
  httpsCallable,
  createUserWithEmailAndPassword: firebaseCreateUserWithEmailAndPassword,
  createUserWithEmailAndPasswordAsAdmin,
  deleteUserByAdmin
};
