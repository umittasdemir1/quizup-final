(() => {
  const isDevelopment = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.search.includes("debug=true");
  };
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
    if (isDevelopment()) {
      console.error(...args);
    } else {
      if (window.logError && args[0]) {
        window.logError({
          error: String(args[0]),
          context: args.slice(1)
        });
      }
    }
  };
  window.devLog = devLog;
  window.devWarn = devWarn;
  window.devError = devError;
  const waitBackend = () => Promise.resolve(window.db || window.supabase || null);
  const fmtDate = (ts) => {
    try {
      if (!ts) return "-";
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString("tr-TR");
    } catch {
      return "-";
    }
  };
  const typeLabel = (t) => t === "mcq" ? "\xC7oktan Se\xE7meli" : t === "open" ? "Klasik (Serbest Yan\u0131t)" : t || "Bilinmiyor";
  const sanitizeHTML = (dirty) => {
    if (!dirty) return "";
    if (typeof dirty !== "string") return String(dirty);
    if (window.DOMPurify) {
      return window.DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ["b", "i", "em", "strong", "u", "br", "p"],
        ALLOWED_ATTR: []
      });
    }
    const div = document.createElement("div");
    div.textContent = dirty;
    return div.innerHTML;
  };
  let toastId = 0;
  const createToast = (msg, kind = "info", duration = 3e3) => {
    const id = ++toastId;
    const container = document.getElementById("toast-container");
    const toast2 = document.createElement("div");
    toast2.className = `toast ${kind}`;
    toast2.setAttribute("data-id", id);
    const icon = kind === "success" ? "\u2713" : kind === "error" ? "\u2715" : kind === "warning" ? "\u26A0" : "\u2139";
    const iconEl = document.createElement("span");
    iconEl.style.fontSize = "18px";
    iconEl.textContent = icon;
    const messageEl = document.createElement("span");
    messageEl.style.flex = "1";
    messageEl.style.color = "#1A2332";
    messageEl.style.fontWeight = "500";
    messageEl.textContent = msg == null ? "" : String(msg);
    const closeEl = document.createElement("span");
    closeEl.className = "toast-close";
    closeEl.textContent = "\xD7";
    const progressEl = document.createElement("div");
    progressEl.className = "toast-progress";
    progressEl.style.color = kind === "error" ? "#dc2626" : kind === "success" ? "#5EC5B6" : kind === "warning" ? "#FF6B4A" : "#4A90A4";
    toast2.append(iconEl, messageEl, closeEl, progressEl);
    const remove = () => {
      toast2.style.animation = "slideIn 0.3s ease-out reverse";
      setTimeout(() => toast2.remove(), 300);
    };
    closeEl.onclick = remove;
    container.appendChild(toast2);
    if (duration > 0) {
      setTimeout(remove, duration);
    }
    return id;
  };
  const toast = (msg, kind = "info", duration = 3e3) => {
    return createToast(msg, kind, duration);
  };
  const validateQuestion = (form) => {
    var _a, _b, _c;
    const errors = {};
    if (!((_a = form.questionText) == null ? void 0 : _a.trim())) {
      errors.questionText = "Soru metni gereklidir";
    } else if (form.questionText.trim().length < 10) {
      errors.questionText = "Soru metni en az 10 karakter olmal\u0131d\u0131r";
    }
    if (!((_b = form.category) == null ? void 0 : _b.trim())) {
      errors.category = "Kategori se\xE7ilmelidir";
    }
    if (!form.difficulty) {
      errors.difficulty = "Zorluk seviyesi se\xE7ilmelidir";
    }
    if (form.type === "mcq") {
      if (form.hasImageOptions) {
        const validImages = form.optionImageUrls.filter((url) => url == null ? void 0 : url.trim());
        if (validImages.length < 2) {
          errors.options = "En az 2 se\xE7enek g\xF6rseli y\xFCklemelidir";
        }
      } else {
        if (!form.options || form.options.length < 2) {
          errors.options = "En az 2 se\xE7enek girmelidir";
        } else {
          const validOptions = form.options.filter((o) => o == null ? void 0 : o.trim());
          if (validOptions.length < 2) {
            errors.options = "En az 2 ge\xE7erli se\xE7enek girmelidir";
          }
        }
      }
      if (!((_c = form.correctAnswer) == null ? void 0 : _c.trim())) {
        errors.correctAnswer = "Do\u011Fru cevap se\xE7ilmelidir";
      }
    }
    return errors;
  };
  const validateSession = (form) => {
    var _a, _b, _c, _d;
    const errors = {};
    if (form.sessionMode !== "open") {
      if (!((_b = (_a = form.employee) == null ? void 0 : _a.fullName) == null ? void 0 : _b.trim())) {
        errors.fullName = "Personel ad\u0131 gereklidir";
      }
      if (!((_d = (_c = form.employee) == null ? void 0 : _c.store) == null ? void 0 : _d.trim())) {
        errors.store = "Ma\u011Faza bilgisi gereklidir";
      }
    }
    if (!form.questionIds || form.questionIds.length === 0) {
      errors.questions = "En az 1 soru se\xE7ilmelidir";
    }
    if (form.timerMode === "total") {
      const secs = Number(form.totalTimerSeconds);
      if (!secs || secs < 30) {
        errors.totalTimerSeconds = "En az 30 saniye giriniz";
      }
    }
    return errors;
  };
  const validateText = (text) => {
    if (!text || typeof text !== "string") return text;
    let result = text.trim();
    if (result.length > 0 && result[0] === result[0].toLowerCase()) {
      result = result[0].toUpperCase() + result.slice(1);
    }
    result = result.replace(/([.!?])\s+([a-zçğıöşü])/g, (match, punct, letter) => {
      return punct + " " + letter.toUpperCase();
    });
    return result;
  };
  const LoadingSpinner = ({ size = 40, text = "Y\xFCkleniyor..." }) => /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center p-8 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "spinner", style: { width: size, height: size } }), text && /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 font-medium" }, text));
  const Page = ({ title, subtitle, extra, children, className }) => /* @__PURE__ */ React.createElement("div", { className: `max-w-7xl mx-auto px-4 ${className || "py-8"}` }, (title || subtitle || extra) && /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-bold text-dark-900" }, title), subtitle && /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 mt-1" }, subtitle)), extra && /* @__PURE__ */ React.createElement("div", null, extra)), children);
  const getCurrentUser = () => {
    if (window.__quizupAuthReady && window.__quizupAuthUser !== void 0) {
      return window.__quizupAuthUser;
    }
    try {
      const userStr = localStorage.getItem("currentUser");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };
  const SESSION_ID_STORAGE_KEY = "quizup:session:id";
  const SESSION_ISSUED_STORAGE_KEY = "quizup:session:issuedAt";
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
      window.devWarn("Session id okunamad\u0131:", err);
      return null;
    }
  };
  const clearLocalSessionInfo = () => {
    try {
      localStorage.removeItem(SESSION_ID_STORAGE_KEY);
      localStorage.removeItem(SESSION_ISSUED_STORAGE_KEY);
    } catch (err) {
      window.devWarn("Session bilgileri temizlenemedi:", err);
    }
    sessionHeartbeatState.userId = null;
    sessionHeartbeatState.sessionId = null;
    if (sessionHeartbeatState.timerId) {
      clearInterval(sessionHeartbeatState.timerId);
      sessionHeartbeatState.timerId = null;
    }
  };
  const SESSION_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const SESSION_ID_GROUP_SIZE = 4;
  const SESSION_ID_TOTAL_LENGTH = 16;
  const generateSessionId = () => {
    var _a;
    const chars = [];
    let randomValues = null;
    try {
      if (typeof window !== "undefined" && ((_a = window.crypto) == null ? void 0 : _a.getRandomValues)) {
        randomValues = new Uint8Array(SESSION_ID_TOTAL_LENGTH);
        window.crypto.getRandomValues(randomValues);
      }
    } catch (err) {
      window.devWarn("getRandomValues kullan\u0131lamad\u0131:", err);
      randomValues = null;
    }
    for (let i = 0; i < SESSION_ID_TOTAL_LENGTH; i++) {
      const randomValue = randomValues ? randomValues[i] : Math.floor(Math.random() * SESSION_ID_ALPHABET.length);
      const index = randomValue % SESSION_ID_ALPHABET.length;
      chars.push(SESSION_ID_ALPHABET[index]);
    }
    const rawId = chars.join("");
    return rawId.replace(new RegExp(`(.{${SESSION_ID_GROUP_SIZE}})(?=.)`, "g"), "$1-");
  };
  const deriveBrowserInfo = () => {
    var _a, _b;
    if (typeof navigator === "undefined") {
      return { name: null, version: null };
    }
    if ((_b = (_a = navigator.userAgentData) == null ? void 0 : _a.brands) == null ? void 0 : _b.length) {
      const primaryBrand = [...navigator.userAgentData.brands].sort((a, b) => ((b == null ? void 0 : b.version) || "").localeCompare((a == null ? void 0 : a.version) || ""))[0];
      if (primaryBrand) {
        return { name: primaryBrand.brand || null, version: primaryBrand.version || null };
      }
    }
    const ua = navigator.userAgent || "";
    const regexMap = [
      { name: "Edge", regex: /Edg(e|A|iOS)?\/(\d+[\.\d]*)/i },
      { name: "Chrome", regex: /Chrome\/(\d+[\.\d]*)/i },
      { name: "Firefox", regex: /Firefox\/(\d+[\.\d]*)/i },
      { name: "Safari", regex: /Version\/(\d+[\.\d]*).*Safari/i }
    ];
    for (const { name, regex } of regexMap) {
      const match = ua.match(regex);
      if (match) {
        return { name, version: match[2] || match[1] || null };
      }
    }
    return { name: ua ? "Bilinmeyen Taray\u0131c\u0131" : null, version: null };
  };
  const createDeviceFingerprintHash = (sourceObj) => {
    const source = JSON.stringify(sourceObj || {});
    if (!source || source === "{}") {
      return null;
    }
    try {
      const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
      const chars = [];
      let hash = 2166136261;
      for (let i = 0; chars.length < 32; i++) {
        const code = source.charCodeAt(i % source.length);
        hash ^= code;
        hash = Math.imul(hash, 16777619) >>> 0;
        const index = hash % alphabet.length;
        chars.push(alphabet[index]);
      }
      return chars.join("");
    } catch (err) {
      window.devWarn("Cihaz parmak izi olu\u015Fturulamad\u0131:", err);
      return null;
    }
  };
  const buildDeviceFingerprint = () => {
    if (typeof navigator === "undefined") {
      return {};
    }
    const browserInfo = deriveBrowserInfo();
    const colorDepth = typeof screen !== "undefined" ? screen.colorDepth || null : null;
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
    var _a, _b;
    if (!sessionHeartbeatState.userId || !sessionHeartbeatState.sessionId) {
      return;
    }
    const now = Date.now();
    if (!force && sessionHeartbeatState.lastSentAt && now - sessionHeartbeatState.lastSentAt < 6e4) {
      return;
    }
    try {
      await ((_b = (_a = window.db) == null ? void 0 : _a.updateSessionHeartbeat) == null ? void 0 : _b.call(
        _a,
        sessionHeartbeatState.userId,
        sessionHeartbeatState.sessionId
      ));
      sessionHeartbeatState.lastSentAt = now;
    } catch (err) {
      window.devWarn("Session heartbeat g\xF6nderilemedi:", err);
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
    sessionHeartbeatState.timerId = setInterval(() => sendSessionHeartbeat(false), 12e4);
    sendSessionHeartbeat(true);
  };
  const registerActiveSessionPromises = /* @__PURE__ */ new Map();
  const registerActiveSession = async (userId) => {
    if (!userId) return null;
    if (registerActiveSessionPromises.has(userId)) {
      return registerActiveSessionPromises.get(userId);
    }
    const registrationPromise = (async () => {
      var _a, _b;
      const device = buildDeviceFingerprint();
      const sessionId = generateSessionId();
      clearLocalSessionInfo();
      const now = Date.now();
      const issuedAt = now;
      try {
        await ((_b = (_a = window.db) == null ? void 0 : _a.registerSession) == null ? void 0 : _b.call(_a, userId, sessionId, {
          device,
          createdAtMs: now,
          lastActiveAtMs: now
        }));
      } catch (err) {
        window.devWarn("Aktif oturum kayd\u0131 yap\u0131lamad\u0131:", err);
        clearLocalSessionInfo();
        return null;
      }
      try {
        localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
        localStorage.setItem(SESSION_ISSUED_STORAGE_KEY, String(issuedAt));
      } catch (storageErr) {
        window.devWarn("Session bilgileri kaydedilemedi:", storageErr);
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
  const sessionRegistrationQueuedUsers = /* @__PURE__ */ new Set();
  let processingSessionRegistrationQueue = false;
  const dequeueSessionRegistration = () => {
    if (!sessionRegistrationQueue.length) {
      return null;
    }
    return sessionRegistrationQueue.shift();
  };
  const finalizeSessionRegistrationPayload = (payload) => {
    if (!(payload == null ? void 0 : payload.userId)) return;
    sessionRegistrationQueuedUsers.delete(payload.userId);
    if (typeof window !== "undefined" && window.__quizupPendingSessionRegistrationUsers) {
      delete window.__quizupPendingSessionRegistrationUsers[payload.userId];
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
            window.devWarn("Oturum kayd\u0131 ger\xE7ekle\u015Ftirilemedi:", payload);
          }
        } catch (err) {
          window.devWarn("Oturum kayd\u0131 kuyru\u011Fu i\u015Flenirken hata olu\u015Ftu:", err);
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
    if (!(payload == null ? void 0 : payload.userId) || sessionRegistrationQueuedUsers.has(payload.userId)) {
      return;
    }
    sessionRegistrationQueuedUsers.add(payload.userId);
    sessionRegistrationQueue.push({ ...payload, queuedAt: Date.now() });
    processSessionRegistrationQueue();
  };
  if (typeof window !== "undefined") {
    if (Array.isArray(window.__quizupPendingSessionRegistrations) && window.__quizupPendingSessionRegistrations.length) {
      const pendingPayloads = window.__quizupPendingSessionRegistrations.splice(0);
      pendingPayloads.forEach((payload) => enqueueSessionRegistrationProcessing(payload));
    }
    window.addEventListener("quizup-register-session", (event) => {
      enqueueSessionRegistrationProcessing((event == null ? void 0 : event.detail) || {});
    });
  }
  const isLoggedIn = () => {
    if (!window.__quizupAuthReady) {
      return getCurrentUser() !== null;
    }
    const authUser = window.__quizupCurrentAuthUser;
    if (!authUser || authUser.isAnonymous) {
      return false;
    }
    return getCurrentUser() !== null;
  };
  const isSuperAdmin = () => {
    const user = getCurrentUser();
    return user && user.isSuperAdmin === true;
  };
  const getSelectedCompany = () => {
    const user = getCurrentUser();
    if (!user) return null;
    if (user.isSuperAdmin === true) {
      try {
        const selected = localStorage.getItem("superadmin:selectedCompany");
        return selected || "all";
      } catch {
        return "all";
      }
    }
    return user.company || null;
  };
  const getCompanyIdentifiersForQuery = () => {
    const user = getCurrentUser();
    if (!user) return [];
    if (user.isSuperAdmin === true) {
      try {
        const companyDataStr = localStorage.getItem("superadmin:selectedCompanyData");
        if (companyDataStr) {
          const companyData = JSON.parse(companyDataStr);
          if (companyData.id === "all") {
            return null;
          }
          const identifiers = [companyData.id];
          if (companyData.name && companyData.name !== companyData.id) {
            identifiers.push(companyData.name);
          }
          return identifiers;
        }
        const selected = localStorage.getItem("superadmin:selectedCompany");
        if (!selected || selected === "all") return null;
        return [selected];
      } catch (e) {
        window.devError("Error reading company data:", e);
        return null;
      }
    }
    return user.company ? [user.company] : [];
  };
  const hasRole = (requiredRole) => {
    const user = getCurrentUser();
    if (!user) return false;
    if (user.isSuperAdmin === true) return true;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
  };
  const isAdmin = () => {
    return isSuperAdmin() || hasRole("admin");
  };
  let pendingAuthToastId = null;
  const requireAuth = (requiredRole = null) => {
    var _a;
    const finalizeToast = () => {
      if (pendingAuthToastId && typeof document !== "undefined") {
        const toastEl = document.querySelector(`.toast[data-id="${pendingAuthToastId}"]`);
        if (toastEl) {
          toastEl.remove();
        }
      }
      pendingAuthToastId = null;
    };
    const verifyAccess = () => {
      finalizeToast();
      if (!window.__quizupAuthReady) {
        return false;
      }
      if (!isLoggedIn()) {
        toast("L\xFCtfen giri\u015F yap\u0131n", "error");
        setTimeout(() => {
          location.hash = "#/login";
        }, 300);
        return false;
      }
      if (requiredRole && !hasRole(requiredRole)) {
        toast("Bu sayfaya eri\u015Fim yetkiniz yok", "error");
        setTimeout(() => {
          location.hash = "#/dashboard";
        }, 300);
        return false;
      }
      return true;
    };
    if (window.__quizupAuthReady) {
      return verifyAccess();
    }
    if (!pendingAuthToastId) {
      pendingAuthToastId = toast("Oturum do\u011Frulan\u0131yor...", "info", 1200);
    }
    (_a = window.__quizupAuthReadyPromise) == null ? void 0 : _a.then(verifyAccess).catch((err) => {
      window.devWarn("Auth readiness check failed", err);
      finalizeToast();
      toast("Oturum do\u011Frulanamad\u0131. L\xFCtfen tekrar giri\u015F yap\u0131n.", "error");
      setTimeout(() => {
        location.hash = "#/login";
      }, 300);
    });
    return false;
  };
  window.__manualLogoutInProgress = false;
  const logout = async (options = {}) => {
    var _a, _b;
    const {
      suppressToast = false,
      toastMessage = "\xC7\u0131k\u0131\u015F yap\u0131ld\u0131",
      toastKind = "success",
      redirect = "#/"
    } = options || {};
    const currentUser = getCurrentUser();
    const sessionId = getCurrentSessionId();
    window.__manualLogoutInProgress = true;
    let logoutError = null;
    try {
      if (window.signOutSupabase) {
        if ((currentUser == null ? void 0 : currentUser.uid) && sessionId) {
          await ((_b = (_a = window.db) == null ? void 0 : _a.removeSession) == null ? void 0 : _b.call(_a, currentUser.uid, sessionId));
        }
        await window.signOutSupabase();
      } else {
        clearLocalSessionInfo();
      }
    } catch (err) {
      logoutError = err;
      window.devError("Logout error:", err);
    } finally {
      window.__manualLogoutInProgress = false;
    }
    try {
      localStorage.removeItem("currentUser");
    } catch (err) {
      window.devWarn("Kullan\u0131c\u0131 bilgileri temizlenemedi:", err);
    }
    clearLocalSessionInfo();
    try {
      window.dispatchEvent(new Event("user-info-updated"));
    } catch (eventErr) {
      window.devWarn("user-info-updated olay\u0131 g\xF6nderilemedi:", eventErr);
    }
    if (!suppressToast) {
      if (logoutError) {
        toast("\xC7\u0131k\u0131\u015F yap\u0131l\u0131rken hata olu\u015Ftu", "error");
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
  window.waitBackend = waitBackend;
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
  if (typeof window !== "undefined") {
    window.addEventListener("quizup-force-logout", (event) => {
      var _a;
      const detail = (event == null ? void 0 : event.detail) || {};
      logout({
        suppressToast: false,
        toastMessage: detail.message || "Oturumunuz sonland\u0131r\u0131ld\u0131.",
        toastKind: detail.kind || "warning",
        redirect: (_a = detail.redirect) != null ? _a : "#/login"
      });
    });
    window.addEventListener("quizup-auth-state", (event) => {
      var _a;
      const authUser = (_a = event == null ? void 0 : event.detail) == null ? void 0 : _a.user;
      if (authUser && !authUser.isAnonymous) {
        const storedSessionId = getCurrentSessionId();
        if (storedSessionId && sessionHeartbeatState.sessionId !== storedSessionId) {
          sessionHeartbeatState.userId = authUser.uid;
          sessionHeartbeatState.sessionId = storedSessionId;
          sessionHeartbeatState.lastSentAt = 0;
          if (sessionHeartbeatState.timerId) {
            clearInterval(sessionHeartbeatState.timerId);
          }
          sessionHeartbeatState.timerId = setInterval(() => sendSessionHeartbeat(false), 12e4);
          sendSessionHeartbeat(true);
        }
      } else {
        if (!authUser) {
          clearLocalSessionInfo();
        }
      }
    });
  }
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      document.addEventListener("blur", (e) => {
        const target = e.target;
        if (target.tagName === "INPUT" && (target.type === "text" || !target.type) || target.tagName === "TEXTAREA") {
          const currentValue = target.value;
          if (currentValue && window.validateText) {
            const validatedValue = window.validateText(currentValue);
            if (validatedValue !== currentValue) {
              target.value = validatedValue;
              const event = new Event("input", { bubbles: true });
              target.dispatchEvent(event);
            }
          }
        }
      }, true);
    });
  }
  const logPageView = (page) => {
    try {
      if (window.gtag) {
        window.gtag("event", "page_view", {
          page_path: page,
          page_title: document.title
        });
      }
    } catch (error) {
      window.devWarn("Analytics page view tracking failed:", error);
    }
  };
  const logEvent = (eventName, params = {}) => {
    try {
      if (window.gtag) {
        window.gtag("event", eventName, {
          ...params,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } catch (error) {
      window.devWarn("Analytics event tracking failed:", error);
    }
  };
  const logError = (errorData) => {
    try {
      window.devError("Application Error:", errorData);
      if (window.gtag) {
        window.gtag("event", "exception", {
          description: errorData.error || "Unknown error",
          fatal: errorData.fatal || false,
          ...errorData
        });
      }
    } catch (error) {
      window.devWarn("Error logging failed:", error);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      var _a;
      logError({
        error: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: (_a = event.error) == null ? void 0 : _a.stack,
        fatal: false
      });
    });
    window.addEventListener("unhandledrejection", (event) => {
      logError({
        error: "Unhandled Promise Rejection: " + event.reason,
        fatal: false
      });
    });
  }
  const trackPerformance = () => {
    try {
      if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
        const responseTime = timing.responseEnd - timing.requestStart;
        logEvent("page_performance", {
          load_time: loadTime,
          dom_ready_time: domReadyTime,
          response_time: responseTime
        });
      }
    } catch (error) {
      window.devWarn("Performance tracking failed:", error);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("load", () => {
      setTimeout(trackPerformance, 1e3);
    });
  }
  window.logPageView = logPageView;
  window.logEvent = logEvent;
  window.logError = logError;
  window.trackPerformance = trackPerformance;
})();
