// Helper Functions

const waitFirebase = () => new Promise(res => {
  if (window.firebase?.db) return res();
  const fn = () => {
    if (window.firebase?.db) {
      window.removeEventListener('fb-ready', fn);
      res();
    }
  };
  window.addEventListener('fb-ready', fn);
});

const fmtDate = (ts) => {
  try {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('tr-TR');
  } catch {
    return '-';
  }
};

const typeLabel = (t) =>
  t === 'mcq' ? 'Çoktan Seçmeli' :
  (t === 'open' ? 'Klasik (Serbest Yanıt)' : (t || 'Bilinmiyor'));

// Device & Session Helpers
const DEVICE_ID_STORAGE_KEY = 'quizup_device_mac';
const SESSION_DOC_STORAGE_KEY = 'quizup_session_doc';
const SESSION_FORCE_TOKEN_KEY = 'quizup_session_force_token';

const ensureDeviceMac = () => {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;

    const bytes = new Uint8Array(6);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    // Ensure locally administered address (set second least significant bit of first octet)
    bytes[0] = (bytes[0] | 0x02) & 0xfe;
    const mac = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, mac);
    return mac;
  } catch (err) {
    console.warn('Device MAC oluşturulamadı', err);
    return '00:00:00:00:00:00';
  }
};

const getDeviceLabel = () => {
  try {
    const { userAgent = '', platform = '' } = navigator || {};
    if (/iphone/i.test(userAgent)) return 'iPhone';
    if (/ipad/i.test(userAgent)) return 'iPad';
    if (/android/i.test(userAgent)) return 'Android';
    if (/mac/i.test(platform)) return 'MacOS';
    if (/win/i.test(platform)) return 'Windows';
    if (/linux/i.test(platform)) return 'Linux';
    return platform || 'Tarayıcı';
  } catch {
    return 'Tarayıcı';
  }
};

const getSessionDocIdForUser = (userId) => {
  if (!userId) return null;
  const mac = ensureDeviceMac();
  const compact = mac.replace(/:/g, '').toLowerCase();
  return `${userId}_${compact}`;
};

const storeSessionDocId = (docId) => {
  try {
    if (docId) {
      localStorage.setItem(SESSION_DOC_STORAGE_KEY, docId);
    } else {
      localStorage.removeItem(SESSION_DOC_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Session doc kimliği kaydedilemedi', err);
  }
};

const readStoredSessionDocId = () => {
  try {
    return localStorage.getItem(SESSION_DOC_STORAGE_KEY);
  } catch {
    return null;
  }
};

const readForceToken = () => {
  try {
    return Number(localStorage.getItem(SESSION_FORCE_TOKEN_KEY) || '0');
  } catch {
    return 0;
  }
};

const writeForceToken = (value) => {
  try {
    if (typeof value === 'number') {
      localStorage.setItem(SESSION_FORCE_TOKEN_KEY, String(value));
    } else {
      localStorage.removeItem(SESSION_FORCE_TOKEN_KEY);
    }
  } catch (err) {
    console.warn('Force token kaydedilemedi', err);
  }
};

const hashString = async (value) => {
  if (typeof value !== 'string') {
    throw new Error('Hashlenecek değer metin olmalıdır');
  }
  if (!value) {
    throw new Error('Boş değer hashlenemez');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  let digest;

  if (window.crypto?.subtle?.digest) {
    digest = await window.crypto.subtle.digest('SHA-256', data);
  } else {
    // Fallback: simple hash (not cryptographically strong but avoids crash)
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(16);
  }

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

let cachedAdminSecretHash = null;
let cachedAdminSecretMeta = null;
let sessionWatcherUnsubscribe = null;

const fetchAdminSecretMeta = async () => {
  await ensureAdminClaims();
  await waitFirebase();
  const { db, doc, getDoc } = window.firebase;
  const docRef = doc(db, 'securitySettings', 'adminControls');
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    cachedAdminSecretHash = data?.overridePasswordHash || null;
    cachedAdminSecretMeta = data || null;
  } else {
    cachedAdminSecretHash = null;
    cachedAdminSecretMeta = null;
  }

  return cachedAdminSecretMeta;
};

const verifyAdminSecret = async (secret) => {
  if (!secret) {
    const error = new Error('Yönetici şifresi girilmedi');
    error.code = 'admin-secret/missing';
    throw error;
  }

  if (!cachedAdminSecretHash) {
    await fetchAdminSecretMeta();
  }

  if (!cachedAdminSecretHash) {
    const error = new Error('Yönetici şifresi tanımlanmamış');
    error.code = 'admin-secret/not-set';
    throw error;
  }

  const hash = await hashString(secret);
  if (hash !== cachedAdminSecretHash) {
    const error = new Error('Yönetici şifresi doğrulanamadı');
    error.code = 'admin-secret/invalid';
    throw error;
  }

  return true;
};

const updateAdminSecret = async (secret, { updatedBy = null } = {}) => {
  if (!secret || secret.length < 6) {
    throw new Error('Yönetici şifresi en az 6 karakter olmalıdır');
  }

  const hash = await hashString(secret);
  await ensureAdminClaims();
  await waitFirebase();
  const { db, doc, setDoc, serverTimestamp } = window.firebase;
  const docRef = doc(db, 'securitySettings', 'adminControls');

  await setDoc(docRef, {
    overridePasswordHash: hash,
    updatedAt: serverTimestamp(),
    updatedBy
  }, { merge: true });

  cachedAdminSecretHash = hash;
  cachedAdminSecretMeta = { ...cachedAdminSecretMeta, overridePasswordHash: hash };
  return hash;
};

const registerActiveSession = async (user, { recordEvent = true } = {}) => {
  if (!user?.uid) return null;

  const sessionDocId = getSessionDocIdForUser(user.uid);
  if (!sessionDocId) return null;

  await waitFirebase();
  const { db, doc, getDoc, setDoc } = window.firebase;
  const docRef = doc(db, 'userSessions', sessionDocId);
  const deviceMac = ensureDeviceMac();
  const deviceId = deviceMac.replace(/:/g, '').toLowerCase();

  let existingData = null;
  try {
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      existingData = snapshot.data();
    }
  } catch (err) {
    console.warn('Oturum kaydı okunamadı', err);
  }

  const now = Date.now();
  let shouldRecordEvent = recordEvent;
  if (!existingData) {
    shouldRecordEvent = true;
  }

  let history = Array.isArray(existingData?.history)
    ? existingData.history.filter((entry) => entry && entry.at).slice(0, 19)
    : [];

  if (shouldRecordEvent) {
    history = [{ type: 'login', at: now }, ...history];
  }

  const payload = {
    userId: user.uid,
    email: user.email || null,
    deviceMac,
    deviceId,
    deviceLabel: getDeviceLabel(),
    userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) || null,
    platform: (typeof navigator !== 'undefined' && navigator.platform) || null,
    lastActiveAt: now,
    updatedAt: now,
    active: true
  };

  if (shouldRecordEvent || !existingData?.lastLoginAt) {
    payload.lastLoginAt = now;
  }

  if (shouldRecordEvent) {
    payload.history = history;
  }

  try {
    await setDoc(docRef, payload, { merge: true });
    storeSessionDocId(sessionDocId);
    await startSessionWatcher(user.uid);
  } catch (err) {
    console.warn('Oturum kaydedilemedi', err);
  }

  return sessionDocId;
};

const stopSessionWatcher = () => {
  if (typeof sessionWatcherUnsubscribe === 'function') {
    try {
      sessionWatcherUnsubscribe();
    } catch (err) {
      console.warn('Oturum izleyicisi kapatılamadı', err);
    }
  }
  sessionWatcherUnsubscribe = null;
};

const markCurrentSessionInactive = async ({ eventType = 'logout' } = {}) => {
  const sessionDocId = readStoredSessionDocId();
  if (!sessionDocId) return;

  await waitFirebase();
  const { db, doc, getDoc, setDoc } = window.firebase;
  const docRef = doc(db, 'userSessions', sessionDocId);
  const now = Date.now();

  try {
    const snapshot = await getDoc(docRef);
    let history = [];
    if (snapshot.exists()) {
      const data = snapshot.data();
      history = Array.isArray(data.history) ? data.history.filter((entry) => entry && entry.at).slice(0, 19) : [];
      history = [{ type: eventType, at: now }, ...history];
    }

    await setDoc(docRef, {
      active: false,
      lastActiveAt: now,
      updatedAt: now,
      history,
      forceLogoutHandledAt: eventType === 'force-logout-handled' ? now : undefined
    }, { merge: true });
  } catch (err) {
    console.warn('Oturum inaktif olarak işaretlenemedi', err);
  } finally {
    storeSessionDocId(null);
  }
};

const startSessionWatcher = async (userId) => {
  if (!userId) return;

  const sessionDocId = getSessionDocIdForUser(userId);
  if (!sessionDocId) return;

  await waitFirebase();
  const { db, doc, onSnapshot } = window.firebase;
  const docRef = doc(db, 'userSessions', sessionDocId);

  stopSessionWatcher();

  sessionWatcherUnsubscribe = onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data();
    if (!data) return;

    const forceLogoutAt = data.forceLogoutAt || 0;
    const handledToken = readForceToken();

    if (forceLogoutAt > handledToken) {
      writeForceToken(forceLogoutAt);
      markCurrentSessionInactive({ eventType: 'force-logout-handled' }).finally(() => {
        toast('Oturumunuz yönetici tarafından kapatıldı.', 'warning');
        logout({ silent: true });
      });
    }
  }, (err) => {
    console.warn('Oturum izleyicisi dinleme hatası', err);
  });

  storeSessionDocId(sessionDocId);
};

const invalidateUserSessions = async (userId, { includeCurrent = true } = {}) => {
  if (!userId) return null;

  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.uid !== userId) {
    await ensureAdminClaims();
  }

  await waitFirebase();
  const { db, collection, query, where, getDocs, doc, setDoc, serverTimestamp } = window.firebase;
  const q = query(collection(db, 'userSessions'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const now = Date.now();

  const updates = snapshot.docs.map((docSnap) => {
    if (!includeCurrent && docSnap.id === readStoredSessionDocId()) {
      return null;
    }

    const data = docSnap.data();
    let history = Array.isArray(data?.history) ? data.history.filter((entry) => entry && entry.at).slice(0, 19) : [];
    history = [{ type: 'force-logout', at: now }, ...history];

    return setDoc(doc(db, 'userSessions', docSnap.id), {
      active: false,
      forceLogoutAt: now,
      lastActiveAt: now,
      updatedAt: now,
      history
    }, { merge: true });
  }).filter(Boolean);

  await Promise.all(updates);

  try {
    await setDoc(doc(db, 'users', userId), {
      sessionInvalidatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Kullanıcı oturum bilgisi güncellenemedi', err);
  }

  if (includeCurrent && userId === getCurrentUser()?.uid) {
    writeForceToken(now);
  }

  return now;
};

const logoutEverywhere = async () => {
  const user = getCurrentUser();
  if (!user?.uid) {
    await logout();
    return;
  }

  try {
    await invalidateUserSessions(user.uid, { includeCurrent: true });
    toast('Tüm cihazlardaki oturumlar kapatılıyor...', 'info', 2500);
  } catch (err) {
    console.error('Tüm cihazlardan çıkış sırasında hata', err);
    toast('Tüm cihazlardan çıkış yapılamadı: ' + (err.message || err), 'error');
  } finally {
    await logout();
  }
};

// Toast System
let toastId = 0;

const createToast = (msg, kind = 'info', duration = 3000) => {
  const id = ++toastId;
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast ${kind}`;
  toast.setAttribute('data-id', id);
  
  const icon = kind === 'success' ? '✓' : 
                kind === 'error' ? '✕' : 
                kind === 'warning' ? '⚠' : 'ℹ';
  
  toast.innerHTML = `
    <span style="font-size: 18px;">${icon}</span>
    <span style="flex: 1; color: #1A2332; font-weight: 500;">${msg}</span>
    <span class="toast-close">×</span>
    <div class="toast-progress" style="color: ${
      kind === 'error' ? '#dc2626' : 
      kind === 'success' ? '#5EC5B6' : 
      kind === 'warning' ? '#FF6B4A' : '#4A90A4'
    }"></div>
  `;
  
  const closeBtn = toast.querySelector('.toast-close');
  const remove = () => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  };
  
  closeBtn.onclick = remove;
  container.appendChild(toast);
  
  if (duration > 0) {
    setTimeout(remove, duration);
  }
  
  return id;
};

const toast = (msg, kind = 'info', duration = 3000) => {
  return createToast(msg, kind, duration);
};

// Validation Helpers
const validateQuestion = (form) => {
  const errors = {};
  
  if (!form.questionText?.trim()) {
    errors.questionText = 'Soru metni gereklidir';
  } else if (form.questionText.trim().length < 10) {
    errors.questionText = 'Soru metni en az 10 karakter olmalıdır';
  }
  
  if (!form.category?.trim()) {
    errors.category = 'Kategori seçilmelidir';
  }
  
  if (!form.difficulty) {
    errors.difficulty = 'Zorluk seviyesi seçilmelidir';
  }
  
  if (form.type === 'mcq') {
    if (form.hasImageOptions) {
      const validImages = form.optionImageUrls.filter(url => url?.trim());
      if (validImages.length < 2) {
        errors.options = 'En az 2 seçenek görseli yüklemelidir';
      }
    } else {
      if (!form.options || form.options.length < 2) {
        errors.options = 'En az 2 seçenek girmelidir';
      } else {
        const validOptions = form.options.filter(o => o?.trim());
        if (validOptions.length < 2) {
          errors.options = 'En az 2 geçerli seçenek girmelidir';
        }
      }
    }
    
    if (!form.correctAnswer?.trim()) {
      errors.correctAnswer = 'Doğru cevap seçilmelidir';
    }
  }
  
  return errors;
};

const validateSession = (form) => {
  const errors = {};
  
  if (!form.employee?.fullName?.trim()) {
    errors.fullName = 'Personel adı gereklidir';
  }
  
  if (!form.employee?.store?.trim()) {
    errors.store = 'Mağaza bilgisi gereklidir';
  }
  
  if (!form.questionIds || form.questionIds.length === 0) {
    errors.questions = 'En az 1 soru seçilmelidir';
  }
  
  return errors;
};

// Text Validation - Capitalize sentences and ensure proper punctuation
const validateText = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  let result = text.trim();
  
  // Capitalize first letter if lowercase
  if (result.length > 0 && result[0] === result[0].toLowerCase()) {
    result = result[0].toUpperCase() + result.slice(1);
  }
  
  // Capitalize after periods, question marks, exclamation marks
  result = result.replace(/([.!?])\s+([a-zçğıöşü])/g, (match, punct, letter) => {
    return punct + ' ' + letter.toUpperCase();
  });
  
  return result;
};

// Loading Component
const LoadingSpinner = ({ size = 40, text = 'Yükleniyor...' }) => (
  <div className="flex flex-col items-center justify-center p-8 gap-4">
    <div className="spinner" style={{ width: size, height: size }}></div>
    {text && <p className="text-dark-500 font-medium">{text}</p>}
  </div>
);

// Page Component
const Page = ({ title, subtitle, extra, children }) => (
  <div className="max-w-7xl mx-auto px-4 py-8">
    <div className="flex justify-between items-start mb-6">
      <div>
        <h1 className="text-3xl font-bold text-dark-900">{title}</h1>
        {subtitle && <p className="text-dark-500 mt-1">{subtitle}</p>}
      </div>
      {extra && <div>{extra}</div>}
    </div>
    {children}
  </div>
);

// Auth Helpers
const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const isLoggedIn = () => {
  const storedUser = getCurrentUser();
  if (!window.__firebaseAuthReady) {
    return storedUser !== null;
  }

  const authUser = window.__firebaseCurrentUser;
  if (!authUser || authUser.isAnonymous) {
    return false;
  }

  return storedUser !== null;
};

const hasRole = (requiredRole) => {
  const user = getCurrentUser();
  if (!user) return false;

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }
  return user.role === requiredRole;
};

const isAdmin = () => {
  return hasRole('admin');
};

let pendingAuthToastId = null;

const fetchAdminClaims = async (forceRefresh = false) => {
  await waitFirebase();
  const { auth, getIdTokenResult } = window.firebase;
  const currentUser = auth.currentUser;

  if (!currentUser) {
    const error = new Error('Yönetici oturumu bulunamadı');
    error.code = 'auth/admin-required';
    throw error;
  }

  try {
    const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    return tokenResult?.claims || null;
  } catch (err) {
    console.warn('Admin yetki bilgileri alınamadı', err);
    if (!forceRefresh) {
      return fetchAdminClaims(true);
    }
    throw err;
  }
};

const ensureAdminClaims = async () => {
  const claims = await fetchAdminClaims(false);
  if (claims?.admin) {
    return claims;
  }

  const refreshedClaims = await fetchAdminClaims(true);
  if (refreshedClaims?.admin) {
    return refreshedClaims;
  }

  const error = new Error('Yönetici yetkisi doğrulanamadı');
  error.code = 'auth/missing-admin-claim';
  throw error;
};

const requireAuth = (requiredRole = null) => {
  const finalizeToast = () => {
    if (pendingAuthToastId && typeof document !== 'undefined') {
      const toastEl = document.querySelector(`.toast[data-id="${pendingAuthToastId}"]`);
      if (toastEl) {
        toastEl.remove();
      }
    }
    pendingAuthToastId = null;
  };

  const verifyAccess = () => {
    finalizeToast();

    if (!window.__firebaseAuthReady) {
      return false;
    }

    if (!isLoggedIn()) {
      toast('Lütfen giriş yapın', 'error');
      setTimeout(() => {
        location.hash = '#/login';
      }, 300);
      return false;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      toast('Bu sayfaya erişim yetkiniz yok', 'error');
      setTimeout(() => {
        location.hash = '#/dashboard';
      }, 300);
      return false;
    }

    return true;
  };

  if (window.__firebaseAuthReady) {
    return verifyAccess();
  }

  if (!pendingAuthToastId) {
    pendingAuthToastId = toast('Oturum doğrulanıyor...', 'info', 1200);
  }

  window.__firebaseAuthReadyPromise
    ?.then(verifyAccess)
    .catch((err) => {
      console.warn('Auth readiness check failed', err);
      finalizeToast();
      toast('Oturum doğrulanamadı. Lütfen tekrar giriş yapın.', 'error');
      setTimeout(() => {
        location.hash = '#/login';
      }, 300);
    });

  return false;
};

const logout = async ({ silent = false } = {}) => {
  try {
    await waitFirebase();
    const { auth, signOut } = window.firebase;
    await markCurrentSessionInactive({ eventType: 'logout' });
    stopSessionWatcher();
    await signOut(auth);
    localStorage.removeItem('currentUser');
    writeForceToken(0);
    if (!silent) {
      toast('Çıkış yapıldı', 'success');
    }
    setTimeout(() => {
      location.hash = '#/';
    }, 500);
  } catch (e) {
    console.error('Logout error:', e);
    toast('Çıkış yapılırken hata oluştu', 'error');
  }
};

// Make available globally
window.waitFirebase = waitFirebase;
window.fmtDate = fmtDate;
window.typeLabel = typeLabel;
window.toast = toast;
window.validateQuestion = validateQuestion;
window.validateSession = validateSession;
window.validateText = validateText;
window.LoadingSpinner = LoadingSpinner;
window.Page = Page;
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
window.hasRole = hasRole;
window.isAdmin = isAdmin;
window.ensureAdminClaims = ensureAdminClaims;
window.requireAuth = requireAuth;
window.logout = logout;
window.registerActiveSession = registerActiveSession;
window.invalidateUserSessions = invalidateUserSessions;
window.logoutEverywhere = logoutEverywhere;
window.getDeviceLabel = getDeviceLabel;
window.ensureDeviceMac = ensureDeviceMac;
window.getAdminSecretMeta = fetchAdminSecretMeta;
window.verifyAdminSecret = verifyAdminSecret;
window.updateAdminSecret = updateAdminSecret;
window.hashString = hashString;

if (typeof window !== 'undefined') {
  window.addEventListener('fb-auth-state', (event) => {
    const firebaseUser = event?.detail?.user;
    if (firebaseUser && !firebaseUser.isAnonymous) {
      registerActiveSession(firebaseUser, { recordEvent: false });
    } else if (!firebaseUser) {
      stopSessionWatcher();
      storeSessionDocId(null);
    }
  });
}

// Auto-apply text validation on blur for all text inputs
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Add blur event listener to all text inputs and textareas
    document.addEventListener('blur', (e) => {
      const target = e.target;
      if ((target.tagName === 'INPUT' && (target.type === 'text' || !target.type)) || target.tagName === 'TEXTAREA') {
        const currentValue = target.value;
        if (currentValue && window.validateText) {
          const validatedValue = window.validateText(currentValue);
          if (validatedValue !== currentValue) {
            target.value = validatedValue;
            // Trigger change event for React
            const event = new Event('input', { bubbles: true });
            target.dispatchEvent(event);
          }
        }
      }
    }, true);
  });
}
