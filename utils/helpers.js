// Helper Functions

// ========================================
// DEVELOPMENT MODE LOGGER
// ========================================

// Check if we're in development mode
const isDevelopment = () => {
  return window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1' ||
         window.location.search.includes('debug=true');
};

// Development-only console logger
const devLog = (...args) => {
  if (isDevelopment()) {
    console.log(...args);
  }
};

const devWarn = (...args) => {
  if (isDevelopment()) {
    console.warn(...args);
  }
};

const devError = (...args) => {
  // Always log errors, but with more detail in dev mode
  if (isDevelopment()) {
    console.error(...args);
  } else {
    // In production, log to error tracking instead
    if (window.logError && args[0]) {
      window.logError({
        error: String(args[0]),
        context: args.slice(1)
      });
    }
  }
};

// Make available globally
window.devLog = devLog;
window.devWarn = devWarn;
window.devError = devError;

// ========================================
// FIREBASE HELPERS
// ========================================

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

// XSS Protection - Sanitize HTML content
const sanitizeHTML = (dirty) => {
  if (!dirty) return '';
  if (typeof dirty !== 'string') return String(dirty);

  // Check if DOMPurify is available
  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
      ALLOWED_ATTR: []
    });
  }

  // Fallback if DOMPurify is not loaded
  const div = document.createElement('div');
  div.textContent = dirty;
  return div.innerHTML;
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

const SESSION_ID_STORAGE_KEY = 'quizup:session:id';
const SESSION_ISSUED_STORAGE_KEY = 'quizup:session:issuedAt';
const sessionHeartbeatState = {
  userId: null,
  sessionId: null,
  timerId: null,
  lastSentAt: 0
};

const getCurrentSessionId = () => {
  try {
    return localStorage.getItem(SESSION_ID_STORAGE_KEY);
  } catch (err) {
    window.devWarn('Session id okunamadı:', err);
    return null;
  }
};

const clearLocalSessionInfo = () => {
  try {
    localStorage.removeItem(SESSION_ID_STORAGE_KEY);
    localStorage.removeItem(SESSION_ISSUED_STORAGE_KEY);
  } catch (err) {
    window.devWarn('Session bilgileri temizlenemedi:', err);
  }
  sessionHeartbeatState.userId = null;
  sessionHeartbeatState.sessionId = null;
  if (sessionHeartbeatState.timerId) {
    clearInterval(sessionHeartbeatState.timerId);
    sessionHeartbeatState.timerId = null;
  }
};

const SESSION_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const SESSION_ID_GROUP_SIZE = 4;
const SESSION_ID_TOTAL_LENGTH = 16;

const generateSessionId = () => {
  const chars = [];
  let randomValues = null;

  try {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      randomValues = new Uint8Array(SESSION_ID_TOTAL_LENGTH);
      window.crypto.getRandomValues(randomValues);
    }
  } catch (err) {
    window.devWarn('getRandomValues kullanılamadı:', err);
    randomValues = null;
  }

  for (let i = 0; i < SESSION_ID_TOTAL_LENGTH; i++) {
    const randomValue = randomValues ? randomValues[i] : Math.floor(Math.random() * SESSION_ID_ALPHABET.length);
    const index = randomValue % SESSION_ID_ALPHABET.length;
    chars.push(SESSION_ID_ALPHABET[index]);
  }

  const rawId = chars.join('');
  return rawId.replace(new RegExp(`(.{${SESSION_ID_GROUP_SIZE}})(?=.)`, 'g'), '$1-');
};

const deriveBrowserInfo = () => {
  if (typeof navigator === 'undefined') {
    return { name: null, version: null };
  }

  if (navigator.userAgentData?.brands?.length) {
    const primaryBrand = [...navigator.userAgentData.brands]
      .sort((a, b) => (b?.version || '').localeCompare(a?.version || ''))[0];
    if (primaryBrand) {
      return { name: primaryBrand.brand || null, version: primaryBrand.version || null };
    }
  }

  const ua = navigator.userAgent || '';
  const regexMap = [
    { name: 'Edge', regex: /Edg(e|A|iOS)?\/(\d+[\.\d]*)/i },
    { name: 'Chrome', regex: /Chrome\/(\d+[\.\d]*)/i },
    { name: 'Firefox', regex: /Firefox\/(\d+[\.\d]*)/i },
    { name: 'Safari', regex: /Version\/(\d+[\.\d]*).*Safari/i }
  ];

  for (const { name, regex } of regexMap) {
    const match = ua.match(regex);
    if (match) {
      return { name, version: match[2] || match[1] || null };
    }
  }

  return { name: ua ? 'Bilinmeyen Tarayıcı' : null, version: null };
};

const createDeviceFingerprintHash = (sourceObj) => {
  const source = JSON.stringify(sourceObj || {});
  if (!source || source === '{}') {
    return null;
  }

  try {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
    const chars = [];
    let hash = 0x811c9dc5;

    for (let i = 0; chars.length < 32; i++) {
      const code = source.charCodeAt(i % source.length);
      hash ^= code;
      hash = Math.imul(hash, 0x01000193) >>> 0;
      const index = hash % alphabet.length;
      chars.push(alphabet[index]);
    }

    return chars.join('');
  } catch (err) {
    window.devWarn('Cihaz parmak izi oluşturulamadı:', err);
    return null;
  }
};

const buildDeviceFingerprint = () => {
  if (typeof navigator === 'undefined') {
    return {};
  }

  const browserInfo = deriveBrowserInfo();
  const colorDepth = typeof screen !== 'undefined' ? (screen.colorDepth || null) : null;
  const fingerprintSource = {
    userAgent: navigator.userAgent || null,
    language: navigator.language || null,
    platform: navigator.platform || null,
    vendor: navigator.vendor || null,
    deviceMemory: navigator.deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    colorDepth,
    browserName: browserInfo.name || null,
    browserVersion: browserInfo.version || null
  };

  return {
    ...fingerprintSource,
    fingerprint: createDeviceFingerprintHash(fingerprintSource)
  };
};

const sendSessionHeartbeat = async (force = false) => {
  if (!sessionHeartbeatState.userId || !sessionHeartbeatState.sessionId) {
    return;
  }

  const now = Date.now();
  if (!force && sessionHeartbeatState.lastSentAt && now - sessionHeartbeatState.lastSentAt < 60000) {
    return;
  }

  try {
    await waitFirebase();
    const { db, doc, updateDoc, serverTimestamp } = window.firebase;
    await updateDoc(doc(db, 'users', sessionHeartbeatState.userId), {
      [`activeSessions.${sessionHeartbeatState.sessionId}.lastActiveAt`]: serverTimestamp(),
      [`activeSessions.${sessionHeartbeatState.sessionId}.lastActiveAtMs`]: now
    });
    sessionHeartbeatState.lastSentAt = now;
  } catch (err) {
    window.devWarn('Session heartbeat gönderilemedi:', err);
  }
};

const startSessionHeartbeat = (userId, sessionId) => {
  if (!userId || !sessionId) {
    return;
  }

  sessionHeartbeatState.userId = userId;
  sessionHeartbeatState.sessionId = sessionId;
  sessionHeartbeatState.lastSentAt = 0;

  if (sessionHeartbeatState.timerId) {
    clearInterval(sessionHeartbeatState.timerId);
  }

  sessionHeartbeatState.timerId = setInterval(() => sendSessionHeartbeat(false), 120000);
  sendSessionHeartbeat(true);
};

const registerActiveSessionPromises = new Map();

const registerActiveSession = async (userId) => {
  if (!userId) return null;

  if (registerActiveSessionPromises.has(userId)) {
    return registerActiveSessionPromises.get(userId);
  }

  const registrationPromise = (async () => {
    await waitFirebase();

    const {
      db,
      doc,
      serverTimestamp,
      setDoc
    } = window.firebase;

    const userRef = doc(db, 'users', userId);
    const device = buildDeviceFingerprint();
    const sessionId = generateSessionId();

    clearLocalSessionInfo();

    const now = Date.now();
    const issuedAt = now;

    const sessionPayload = {
      device,
      createdAt: serverTimestamp(),
      createdAtMs: now,
      lastActiveAt: serverTimestamp(),
      lastActiveAtMs: now
    };

    try {
      await setDoc(userRef, {
        activeSessions: {
          [sessionId]: sessionPayload
        },
        lastSessionUpdate: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      window.devWarn('Aktif oturum kaydı yapılamadı:', err);
      clearLocalSessionInfo();
      return null;
    }

    try {
      localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
      localStorage.setItem(SESSION_ISSUED_STORAGE_KEY, String(issuedAt));
    } catch (storageErr) {
      window.devWarn('Session bilgileri kaydedilemedi:', storageErr);
    }

    startSessionHeartbeat(userId, sessionId);

    return { sessionId, issuedAt };
  })();

  registerActiveSessionPromises.set(userId, registrationPromise);

  try {
    return await registrationPromise;
  } finally {
    registerActiveSessionPromises.delete(userId);
  }
};

const sessionRegistrationQueue = [];
const sessionRegistrationQueuedUsers = new Set();
let processingSessionRegistrationQueue = false;

const dequeueSessionRegistration = () => {
  if (!sessionRegistrationQueue.length) {
    return null;
  }
  return sessionRegistrationQueue.shift();
};

const finalizeSessionRegistrationPayload = (payload) => {
  if (!payload?.userId) return;
  sessionRegistrationQueuedUsers.delete(payload.userId);
  if (typeof window !== 'undefined' && window.__pendingSessionRegistrationUsers) {
    delete window.__pendingSessionRegistrationUsers[payload.userId];
  }
};

const processSessionRegistrationQueue = async () => {
  if (processingSessionRegistrationQueue) {
    return;
  }

  processingSessionRegistrationQueue = true;

  try {
    let payload = dequeueSessionRegistration();

    while (payload) {
      try {
        const result = await registerActiveSession(payload.userId);
        if (!result) {
          window.devWarn('Oturum kaydı gerçekleştirilemedi:', payload);
        }
      } catch (err) {
        window.devWarn('Oturum kaydı kuyruğu işlenirken hata oluştu:', err);
      } finally {
        finalizeSessionRegistrationPayload(payload);
      }

      payload = dequeueSessionRegistration();
    }
  } finally {
    processingSessionRegistrationQueue = false;
  }
};

const enqueueSessionRegistrationProcessing = (payload) => {
  if (!payload?.userId || sessionRegistrationQueuedUsers.has(payload.userId)) {
    return;
  }

  sessionRegistrationQueuedUsers.add(payload.userId);
  sessionRegistrationQueue.push({ ...payload, queuedAt: Date.now() });
  processSessionRegistrationQueue();
};

if (typeof window !== 'undefined') {
  if (Array.isArray(window.__pendingSessionRegistrations) && window.__pendingSessionRegistrations.length) {
    const pendingPayloads = window.__pendingSessionRegistrations.splice(0);
    pendingPayloads.forEach((payload) => enqueueSessionRegistrationProcessing(payload));
  }

  window.addEventListener('firebase-register-session', (event) => {
    enqueueSessionRegistrationProcessing(event?.detail || {});
  });

  window.addEventListener('focus', () => sendSessionHeartbeat(true));
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      sendSessionHeartbeat(true);
    }
  });
}

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

const isSuperAdmin = () => {
  const user = getCurrentUser();
  return user && user.isSuperAdmin === true;
};

// Get selected company for filtering
// Super admin: returns selected company from localStorage ('all' or specific company)
// Admin/Manager: returns their own company
const getSelectedCompany = () => {
  const user = getCurrentUser();
  if (!user) return null;

  // Super admin can select company
  if (user.isSuperAdmin === true) {
    try {
      const selected = localStorage.getItem('superadmin:selectedCompany');
      return selected || 'all';
    } catch {
      return 'all';
    }
  }

  // Regular users see only their company
  return user.company || null;
};

// Get company identifiers for Firestore queries with backward compatibility
// Returns array of identifiers [id, name] to handle cases where:
// - Some collections use document ID as company field
// - Other collections use company name as company field
const getCompanyIdentifiersForQuery = () => {
  const user = getCurrentUser();
  if (!user) return [];

  // Super admin can select company
  if (user.isSuperAdmin === true) {
    try {
      const companyDataStr = localStorage.getItem('superadmin:selectedCompanyData');
      if (companyDataStr) {
        const companyData = JSON.parse(companyDataStr);

        // If "all companies" selected, return empty array (no filter needed)
        if (companyData.id === 'all') {
          return null; // Signal to not use where clause
        }

        // Return both ID and name for backward compatibility
        const identifiers = [companyData.id];
        if (companyData.name && companyData.name !== companyData.id) {
          identifiers.push(companyData.name);
        }
        return identifiers;
      }
      // Fallback to old method if new data not available
      const selected = localStorage.getItem('superadmin:selectedCompany');
      // If no selection or 'all', return null (no filter)
      if (!selected || selected === 'all') return null;
      return [selected];
    } catch (e) {
      window.devError('Error reading company data:', e);
      return null;
    }
  }

  // Regular users: use their company name
  return user.company ? [user.company] : [];
};

const hasRole = (requiredRole) => {
  const user = getCurrentUser();
  if (!user) return false;

  // Super admin tüm rollere erişebilir
  if (user.isSuperAdmin === true) return true;

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }
  return user.role === requiredRole;
};

const isAdmin = () => {
  // Super admin da admin olarak kabul edilir
  return isSuperAdmin() || hasRole('admin');
};

let pendingAuthToastId = null;

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
      window.devWarn('Auth readiness check failed', err);
      finalizeToast();
      toast('Oturum doğrulanamadı. Lütfen tekrar giriş yapın.', 'error');
      setTimeout(() => {
        location.hash = '#/login';
      }, 300);
    });

  return false;
};

window.__manualLogoutInProgress = false;

const logout = async (options = {}) => {
  const {
    suppressToast = false,
    toastMessage = 'Çıkış yapıldı',
    toastKind = 'success',
    redirect = '#/'
  } = options || {};

  const currentUser = getCurrentUser();
  const sessionId = getCurrentSessionId();

  window.__manualLogoutInProgress = true;

  let logoutError = null;

  try {
    await waitFirebase();
    const { auth, signOut, db, doc, updateDoc, deleteField, serverTimestamp } = window.firebase;

    if (currentUser?.uid && sessionId) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          [`activeSessions.${sessionId}`]: deleteField(),
          lastSessionUpdate: serverTimestamp()
        });
      } catch (sessionErr) {
        window.devWarn('Oturum kaydı temizlenemedi:', sessionErr);
      }
    }

    await signOut(auth);
  } catch (err) {
    logoutError = err;
    window.devError('Logout error:', err);
  } finally {
    window.__manualLogoutInProgress = false;
  }

  try {
    localStorage.removeItem('currentUser');
  } catch (err) {
    window.devWarn('Kullanıcı bilgileri temizlenemedi:', err);
  }

  clearLocalSessionInfo();

  try {
    window.dispatchEvent(new Event('user-info-updated'));
  } catch (eventErr) {
    window.devWarn('user-info-updated olayı gönderilemedi:', eventErr);
  }

  if (!suppressToast) {
    if (logoutError) {
      toast('Çıkış yapılırken hata oluştu', 'error');
    } else {
      toast(toastMessage, toastKind);
    }
  }

  if (redirect) {
    setTimeout(() => {
      location.hash = redirect;
    }, 500);
  }

  return !logoutError;
};

// Make available globally
window.waitFirebase = waitFirebase;
window.fmtDate = fmtDate;
window.typeLabel = typeLabel;
window.sanitizeHTML = sanitizeHTML;
window.toast = toast;
window.validateQuestion = validateQuestion;
window.validateSession = validateSession;
window.validateText = validateText;
window.LoadingSpinner = LoadingSpinner;
window.Page = Page;
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
window.isSuperAdmin = isSuperAdmin;
window.getSelectedCompany = getSelectedCompany;
window.getCompanyIdentifiersForQuery = getCompanyIdentifiersForQuery;
window.hasRole = hasRole;
window.isAdmin = isAdmin;
window.requireAuth = requireAuth;
window.registerActiveSession = registerActiveSession;
window.getCurrentSessionId = getCurrentSessionId;
window.logout = logout;

if (typeof window !== 'undefined') {
  window.addEventListener('firebase-force-logout', (event) => {
    const detail = event?.detail || {};
    logout({
      suppressToast: false,
      toastMessage: detail.message || 'Oturumunuz sonlandırıldı.',
      toastKind: detail.kind || 'warning',
      redirect: detail.redirect ?? '#/login'
    });
  });

  window.addEventListener('fb-auth-state', (event) => {
    const authUser = event?.detail?.user;

    if (authUser && !authUser.isAnonymous) {
      const storedSessionId = getCurrentSessionId();
      if (storedSessionId && sessionHeartbeatState.sessionId !== storedSessionId) {
        sessionHeartbeatState.userId = authUser.uid;
        sessionHeartbeatState.sessionId = storedSessionId;
        sessionHeartbeatState.lastSentAt = 0;

        if (sessionHeartbeatState.timerId) {
          clearInterval(sessionHeartbeatState.timerId);
        }

        sessionHeartbeatState.timerId = setInterval(() => sendSessionHeartbeat(false), 120000);
        sendSessionHeartbeat(true);
      }
    } else {
      if (!authUser) {
        clearLocalSessionInfo();
      }
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

// ========================================
// MONITORING & ANALYTICS
// ========================================

// Log page view
const logPageView = (page) => {
  try {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: page,
        page_title: document.title
      });
    }
  } catch (error) {
    window.devWarn('Analytics page view tracking failed:', error);
  }
};

// Log custom event
const logEvent = (eventName, params = {}) => {
  try {
    if (window.gtag) {
      window.gtag('event', eventName, {
        ...params,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    window.devWarn('Analytics event tracking failed:', error);
  }
};

// Log error to analytics
const logError = (errorData) => {
  try {
    // Log to console
    window.devError('Application Error:', errorData);

    // Log to analytics
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: errorData.error || 'Unknown error',
        fatal: errorData.fatal || false,
        ...errorData
      });
    }

    // Optionally save to Firestore for later analysis
    if (window.firebase?.db && errorData.fatal) {
      const { db, collection, addDoc, serverTimestamp } = window.firebase;
      addDoc(collection(db, 'errorLogs'), {
        ...errorData,
        timestamp: serverTimestamp()
      }).catch(err => window.devWarn('Failed to save error to Firestore:', err));
    }
  } catch (error) {
    window.devWarn('Error logging failed:', error);
  }
};

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logError({
      error: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
      fatal: false
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError({
      error: 'Unhandled Promise Rejection: ' + event.reason,
      fatal: false
    });
  });
}

// Track performance metrics
const trackPerformance = () => {
  try {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
      const responseTime = timing.responseEnd - timing.requestStart;

      logEvent('page_performance', {
        load_time: loadTime,
        dom_ready_time: domReadyTime,
        response_time: responseTime
      });
    }
  } catch (error) {
    window.devWarn('Performance tracking failed:', error);
  }
};

// Track page load performance
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Wait a bit for all resources to load
    setTimeout(trackPerformance, 1000);
  });
}

// Make monitoring functions globally available
window.logPageView = logPageView;
window.logEvent = logEvent;
window.logError = logError;
window.trackPerformance = trackPerformance;
