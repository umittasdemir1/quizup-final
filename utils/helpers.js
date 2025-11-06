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
    console.warn('Session id okunamadı:', err);
    return null;
  }
};

const clearLocalSessionInfo = () => {
  try {
    localStorage.removeItem(SESSION_ID_STORAGE_KEY);
    localStorage.removeItem(SESSION_ISSUED_STORAGE_KEY);
  } catch (err) {
    console.warn('Session bilgileri temizlenemedi:', err);
  }
  sessionHeartbeatState.userId = null;
  sessionHeartbeatState.sessionId = null;
  if (sessionHeartbeatState.timerId) {
    clearInterval(sessionHeartbeatState.timerId);
    sessionHeartbeatState.timerId = null;
  }
};

const generateSessionId = () => {
  try {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
  } catch (err) {
    console.warn('randomUUID kullanılamadı:', err);
  }

  return 'sess-' + Math.random().toString(16).slice(2) + Date.now().toString(16);
};

const buildDeviceFingerprint = () => {
  if (typeof navigator === 'undefined') {
    return {};
  }

  return {
    userAgent: navigator.userAgent || null,
    language: navigator.language || null,
    platform: navigator.platform || null,
    vendor: navigator.vendor || null,
    deviceMemory: navigator.deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null
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
    console.warn('Session heartbeat gönderilemedi:', err);
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

const registerActiveSession = async (userId) => {
  if (!userId) return null;

  const previousSessionId = getCurrentSessionId();
  if (previousSessionId) {
    try {
      await waitFirebase();
      const { db, doc, updateDoc, deleteField, serverTimestamp } = window.firebase;
      await updateDoc(doc(db, 'users', userId), {
        [`activeSessions.${previousSessionId}`]: deleteField(),
        lastSessionUpdate: serverTimestamp()
      });
    } catch (cleanupErr) {
      console.warn('Önceki oturum kaydı temizlenemedi:', cleanupErr);
    }
  }

  clearLocalSessionInfo();

  const sessionId = generateSessionId();
  const issuedAt = Date.now();

  const device = buildDeviceFingerprint();

  try {
    await waitFirebase();
    const { db, doc, updateDoc, serverTimestamp } = window.firebase;
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      [`activeSessions.${sessionId}`]: {
        createdAt: serverTimestamp(),
        createdAtMs: issuedAt,
        lastActiveAt: serverTimestamp(),
        lastActiveAtMs: issuedAt,
        device
      },
      lastSessionUpdate: serverTimestamp()
    });
  } catch (err) {
    console.warn('Aktif oturum kaydı yapılamadı:', err);
  }

  try {
    localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
    localStorage.setItem(SESSION_ISSUED_STORAGE_KEY, String(issuedAt));
  } catch (storageErr) {
    console.warn('Session bilgileri kaydedilemedi:', storageErr);
  }

  startSessionHeartbeat(userId, sessionId);

  return { sessionId, issuedAt };
};

if (typeof window !== 'undefined') {
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
        console.warn('Oturum kaydı temizlenemedi:', sessionErr);
      }
    }

    await signOut(auth);
  } catch (err) {
    logoutError = err;
    console.error('Logout error:', err);
  } finally {
    window.__manualLogoutInProgress = false;
  }

  try {
    localStorage.removeItem('currentUser');
  } catch (err) {
    console.warn('Kullanıcı bilgileri temizlenemedi:', err);
  }

  clearLocalSessionInfo();

  try {
    window.dispatchEvent(new Event('user-info-updated'));
  } catch (eventErr) {
    console.warn('user-info-updated olayı gönderilemedi:', eventErr);
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
