(() => {
  const { useState, useEffect, useRef, useMemo } = React;
  const Manager = () => {
    const [sessions, setSessions] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
      employee: { fullName: "", store: "" },
      questionIds: [],
      sessionMode: "individual",
      timerMode: "per_question",
      totalTimerSeconds: 600
    });
    const [errors, setErrors] = useState({});
    const [qrUrl, setQrUrl] = useState("");
    const [createdSessionId, setCreatedSessionId] = useState(null);
    const [createdSessionMode, setCreatedSessionMode] = useState("individual");
    const qrRef = useRef(null);
    const [lobbyParticipants, setLobbyParticipants] = useState([]);
    const [lobbyStartedAt, setLobbyStartedAt] = useState(null);
    const [lobbyTimeLeft, setLobbyTimeLeft] = useState(null);
    const lobbyIntervalRef = useRef(null);
    const lobbySessionPollRef = useRef(null);
    const [showFilters, setShowFilters] = useState(false);
    const [showSort, setShowSort] = useState(false);
    const [filters, setFilters] = useState({
      categories: [],
      difficulties: [],
      types: [],
      timers: []
    });
    const [search, setSearch] = useState("");
    const [sortOption, setSortOption] = useState("order-asc");
    const filterRef = useRef(null);
    const sortRef = useRef(null);
    const animatedPlaceholder = useAnimatedPlaceholder();
    const [packages, setPackages] = useState([]);
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState(null);
    const [packageForm, setPackageForm] = useState({ name: "", questionIds: [] });
    const [packageErrors, setPackageErrors] = useState({});
    const [packageSearch, setPackageSearch] = useState("");
    const [packageFilters, setPackageFilters] = useState({
      categories: [],
      difficulties: [],
      types: [],
      timers: []
    });
    const [packageSort, setPackageSort] = useState("order-asc");
    const [showPackageFilters, setShowPackageFilters] = useState(false);
    const [showPackageSort, setShowPackageSort] = useState(false);
    const packageFilterRef = useRef(null);
    const packageSortRef = useRef(null);
    const getDbCompanyId = () => {
      const cu = getCurrentUser();
      if (!cu) return null;
      if (cu.isSuperAdmin) {
        try {
          const sel = JSON.parse(localStorage.getItem("superadmin:selectedCompanyData") || "null");
          if ((sel == null ? void 0 : sel.id) && sel.id !== "all") return sel.id;
          return null;
        } catch {
          return null;
        }
      }
      return cu.companyId || null;
    };
    useEffect(() => {
      let unsubSessions, unsubQuestions;
      const loadData = () => {
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        const companyId = getDbCompanyId();
        if (!companyId && !currentUser.isSuperAdmin) {
          setSessions([]);
          setQuestions([]);
          setLoading(false);
          return;
        }
        unsubSessions = window.db.onSessionsSnapshot(companyId, (data) => {
          setSessions(data);
        });
        unsubQuestions = window.db.onQuestionsSnapshot(companyId, (data) => {
          const ordered = data.filter((q) => q.isActive).map((q, index) => ({ ...q, __originalIndex: index })).sort((a, b) => {
            const orderA = typeof a.order === "number" ? a.order : a.__originalIndex;
            const orderB = typeof b.order === "number" ? b.order : b.__originalIndex;
            return orderA - orderB;
          }).map(({ __originalIndex, ...rest }) => rest);
          setQuestions(ordered);
          setLoading(false);
        });
      };
      loadData();
      const handleCompanyChange = () => {
        if (unsubSessions) unsubSessions();
        if (unsubQuestions) unsubQuestions();
        setLoading(true);
        loadData();
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => {
        if (unsubSessions) unsubSessions();
        if (unsubQuestions) unsubQuestions();
        window.removeEventListener("company-changed", handleCompanyChange);
      };
    }, []);
    useEffect(() => {
      let unsubscribe;
      const loadPackages = () => {
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        const companyId = getDbCompanyId();
        if (!companyId && !currentUser.isSuperAdmin) {
          setPackages([]);
          return;
        }
        const isAdmin = currentUser.role === "admin" || currentUser.isSuperAdmin === true;
        const createdBy = isAdmin ? null : currentUser.uid;
        unsubscribe = window.db.onPackagesSnapshot(companyId, createdBy, (data) => {
          setPackages(data);
        });
      };
      loadPackages();
      const handleCompanyChange = () => {
        if (unsubscribe) unsubscribe();
        loadPackages();
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => {
        if (unsubscribe) unsubscribe();
        window.removeEventListener("company-changed", handleCompanyChange);
      };
    }, []);
    useEffect(() => {
      if (!createdSessionId || createdSessionMode !== "open") return;
      const LOBBY_DURATION = 60;
      const unsubParticipants = window.db.onSessionParticipantsSnapshot(createdSessionId, (data) => {
        setLobbyParticipants(data);
      });
      const pollSession = async () => {
        try {
          const fresh = await window.db.getSessionById(createdSessionId);
          if ((fresh == null ? void 0 : fresh.lobbyStartedAt) && !lobbyStartedAt) {
            setLobbyStartedAt(fresh.lobbyStartedAt);
          }
        } catch (e) {
        }
        lobbySessionPollRef.current = setTimeout(pollSession, 2e3);
      };
      pollSession();
      return () => {
        unsubParticipants();
        clearTimeout(lobbySessionPollRef.current);
      };
    }, [createdSessionId, createdSessionMode]);
    useEffect(() => {
      if (!lobbyStartedAt) return;
      const LOBBY_DURATION = 60;
      const tick = () => {
        const elapsed = Math.floor((Date.now() - new Date(lobbyStartedAt).getTime()) / 1e3);
        setLobbyTimeLeft(Math.max(0, LOBBY_DURATION - elapsed));
      };
      tick();
      lobbyIntervalRef.current = setInterval(tick, 1e3);
      return () => clearInterval(lobbyIntervalRef.current);
    }, [lobbyStartedAt]);
    useEffect(() => {
      const handleClickOutside = (e) => {
        if (e.target.closest("[data-question-filter-toggle]")) return;
        if (e.target.closest("[data-question-sort-toggle]")) return;
        if (e.target.closest("[data-package-filter-toggle]")) return;
        if (e.target.closest("[data-package-sort-toggle]")) return;
        if (showFilters && filterRef.current && !filterRef.current.contains(e.target)) {
          setShowFilters(false);
        }
        if (showSort && sortRef.current && !sortRef.current.contains(e.target)) {
          setShowSort(false);
        }
        if (showPackageFilters && packageFilterRef.current && !packageFilterRef.current.contains(e.target)) {
          setShowPackageFilters(false);
        }
        if (showPackageSort && packageSortRef.current && !packageSortRef.current.contains(e.target)) {
          setShowPackageSort(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showFilters, showSort, showPackageFilters, showPackageSort]);
    const orderMap = useMemo(() => {
      const map = /* @__PURE__ */ new Map();
      questions.forEach((q, index) => {
        map.set(q.id, index);
      });
      return map;
    }, [questions]);
    const sortIdsByOrder = (ids) => {
      return [...ids].sort((a, b) => {
        const orderA = orderMap.get(a);
        const orderB = orderMap.get(b);
        if (orderA == null && orderB == null) return 0;
        if (orderA == null) return 1;
        if (orderB == null) return -1;
        return orderA - orderB;
      });
    };
    const uniqueCategories = useMemo(
      () => [...new Set(questions.map((q) => q.category).filter(Boolean))].sort(),
      [questions]
    );
    const uniqueTypes = useMemo(
      () => [...new Set(questions.map((q) => q.type).filter(Boolean))],
      [questions]
    );
    const difficulties = useMemo(() => [
      { value: "easy", label: "Kolay" },
      { value: "medium", label: "Orta" },
      { value: "hard", label: "Zor" }
    ], []);
    const sortOptions = useMemo(() => [
      { value: "order-asc", label: "Numara (Artan)" },
      { value: "order-desc", label: "Numara (Azalan)" },
      { value: "text-asc", label: "Soru Metni (A \u2192 Z)" },
      { value: "text-desc", label: "Soru Metni (Z \u2192 A)" },
      { value: "created-desc", label: "Olu\u015Fturulma (Yeni \u2192 Eski)" },
      { value: "created-asc", label: "Olu\u015Fturulma (Eski \u2192 Yeni)" },
      { value: "difficulty-easy", label: "Zorluk (Kolay \u2192 Zor)" },
      { value: "difficulty-hard", label: "Zorluk (Zor \u2192 Kolay)" },
      { value: "category-asc", label: "Kategori (A \u2192 Z)" },
      { value: "category-desc", label: "Kategori (Z \u2192 A)" }
    ], []);
    const toggleFilter = (type, value) => {
      setFilters((prev) => ({
        ...prev,
        [type]: prev[type].includes(value) ? prev[type].filter((v) => v !== value) : [...prev[type], value]
      }));
    };
    const clearFilters = () => {
      setFilters({ categories: [], difficulties: [], types: [], timers: [] });
    };
    const resetFilters = () => {
      setSearch("");
      clearFilters();
      setShowFilters(false);
    };
    const activeFilterCount = filters.categories.length + filters.difficulties.length + filters.types.length + filters.timers.length;
    const togglePackageFilter = (type, value) => {
      setPackageFilters((prev) => ({
        ...prev,
        [type]: prev[type].includes(value) ? prev[type].filter((v) => v !== value) : [...prev[type], value]
      }));
    };
    const clearPackageFilters = () => {
      setPackageFilters({ categories: [], difficulties: [], types: [], timers: [] });
    };
    const resetPackageFilters = () => {
      setPackageSearch("");
      clearPackageFilters();
      setShowPackageFilters(false);
    };
    const activePackageFilterCount = packageFilters.categories.length + packageFilters.difficulties.length + packageFilters.types.length + packageFilters.timers.length;
    const getDisplayOrder = (question, index) => typeof question.order === "number" ? question.order + 1 : index + 1;
    const toMillis = (ts) => {
      try {
        if (!ts) return 0;
        if (typeof ts.toMillis === "function") return ts.toMillis();
        if (typeof ts.toDate === "function") return ts.toDate().getTime();
        if (typeof ts === "number") return ts;
        if (ts.seconds) return ts.seconds * 1e3 + Math.round((ts.nanoseconds || 0) / 1e6);
        return new Date(ts).getTime() || 0;
      } catch (error) {
        return 0;
      }
    };
    const visibleQuestions = useMemo(() => {
      const term = search.trim().toLowerCase();
      const wantsTimed = filters.timers.includes("timed");
      const wantsUntimed = filters.timers.includes("untimed");
      const base = questions.map((q, index) => ({
        data: q,
        originalIndex: index,
        orderNumber: getDisplayOrder(q, index)
      }));
      const filtered = base.filter(({ data }) => {
        if (filters.categories.length > 0 && (!data.category || !filters.categories.includes(data.category))) {
          return false;
        }
        if (filters.difficulties.length > 0 && (!data.difficulty || !filters.difficulties.includes(data.difficulty))) {
          return false;
        }
        if (filters.types.length > 0 && (!data.type || !filters.types.includes(data.type))) {
          return false;
        }
        if (filters.timers.length > 0) {
          const isTimed = Boolean(data.hasTimer && Number(data.timerSeconds) > 0);
          if (wantsTimed && wantsUntimed) {
          } else if (wantsTimed && !isTimed) {
            return false;
          } else if (wantsUntimed && isTimed) {
            return false;
          }
        }
        if (!term) {
          return true;
        }
        const haystack = [
          data.questionText,
          data.category,
          data.correctAnswer,
          ...Array.isArray(data.options) ? data.options : []
        ].filter(Boolean).map((item) => String(item).toLowerCase());
        return haystack.some((text) => text.includes(term));
      });
      const difficultyOrder = { "easy": 1, "medium": 2, "hard": 3 };
      const sorted = [...filtered].sort((a, b) => {
        switch (sortOption) {
          case "order-desc":
            return b.orderNumber - a.orderNumber || a.originalIndex - b.originalIndex;
          case "text-asc":
            return (a.data.questionText || "").localeCompare(b.data.questionText || "");
          case "text-desc":
            return (b.data.questionText || "").localeCompare(a.data.questionText || "");
          case "created-desc":
            return toMillis(b.data.createdAt) - toMillis(a.data.createdAt);
          case "created-asc":
            return toMillis(a.data.createdAt) - toMillis(b.data.createdAt);
          case "difficulty-easy":
            return (difficultyOrder[a.data.difficulty] || 2) - (difficultyOrder[b.data.difficulty] || 2);
          case "difficulty-hard":
            return (difficultyOrder[b.data.difficulty] || 2) - (difficultyOrder[a.data.difficulty] || 2);
          case "category-asc":
            return (a.data.category || "").localeCompare(b.data.category || "") || a.orderNumber - b.orderNumber;
          case "category-desc":
            return (b.data.category || "").localeCompare(a.data.category || "") || a.orderNumber - b.orderNumber;
          case "order-asc":
          default:
            return a.orderNumber - b.orderNumber || a.originalIndex - b.originalIndex;
        }
      });
      return sorted;
    }, [questions, filters, search, sortOption]);
    const visiblePackageQuestions = useMemo(() => {
      const term = packageSearch.trim().toLowerCase();
      const wantsTimed = packageFilters.timers.includes("timed");
      const wantsUntimed = packageFilters.timers.includes("untimed");
      const base = questions.map((q, index) => ({
        data: q,
        originalIndex: index,
        orderNumber: getDisplayOrder(q, index)
      }));
      const filtered = base.filter(({ data }) => {
        if (packageFilters.categories.length > 0 && (!data.category || !packageFilters.categories.includes(data.category))) {
          return false;
        }
        if (packageFilters.difficulties.length > 0 && (!data.difficulty || !packageFilters.difficulties.includes(data.difficulty))) {
          return false;
        }
        if (packageFilters.types.length > 0 && (!data.type || !packageFilters.types.includes(data.type))) {
          return false;
        }
        if (packageFilters.timers.length > 0) {
          const isTimed = Boolean(data.hasTimer && Number(data.timerSeconds) > 0);
          if (wantsTimed && wantsUntimed) {
          } else if (wantsTimed && !isTimed) {
            return false;
          } else if (wantsUntimed && isTimed) {
            return false;
          }
        }
        if (!term) {
          return true;
        }
        const haystack = [
          data.questionText,
          data.category,
          data.correctAnswer,
          ...Array.isArray(data.options) ? data.options : []
        ].filter(Boolean).map((item) => String(item).toLowerCase());
        return haystack.some((text) => text.includes(term));
      });
      const difficultyOrder = { "easy": 1, "medium": 2, "hard": 3 };
      const sorted = [...filtered].sort((a, b) => {
        switch (packageSort) {
          case "order-desc":
            return b.orderNumber - a.orderNumber || a.originalIndex - b.originalIndex;
          case "text-asc":
            return (a.data.questionText || "").localeCompare(b.data.questionText || "");
          case "text-desc":
            return (b.data.questionText || "").localeCompare(a.data.questionText || "");
          case "created-desc":
            return toMillis(b.data.createdAt) - toMillis(a.data.createdAt);
          case "created-asc":
            return toMillis(a.data.createdAt) - toMillis(b.data.createdAt);
          case "difficulty-easy":
            return (difficultyOrder[a.data.difficulty] || 2) - (difficultyOrder[b.data.difficulty] || 2);
          case "difficulty-hard":
            return (difficultyOrder[b.data.difficulty] || 2) - (difficultyOrder[a.data.difficulty] || 2);
          case "category-asc":
            return (a.data.category || "").localeCompare(b.data.category || "") || a.orderNumber - b.orderNumber;
          case "category-desc":
            return (b.data.category || "").localeCompare(a.data.category || "") || a.orderNumber - b.orderNumber;
          case "order-asc":
          default:
            return a.orderNumber - b.orderNumber || a.originalIndex - b.originalIndex;
        }
      });
      return sorted;
    }, [questions, packageFilters, packageSearch, packageSort]);
    const reset = () => {
      setForm({ employee: { fullName: "", store: "" }, questionIds: [], sessionMode: "individual", timerMode: "per_question", totalTimerSeconds: 600 });
      setShowForm(false);
      setQrUrl("");
      setCreatedSessionId(null);
      setCreatedSessionMode("individual");
      setErrors({});
      setFilters({ categories: [], difficulties: [], types: [], timers: [] });
      setSearch("");
      setLobbyParticipants([]);
      setLobbyStartedAt(null);
      setLobbyTimeLeft(null);
      clearInterval(lobbyIntervalRef.current);
      clearTimeout(lobbySessionPollRef.current);
    };
    const toggleQ = (id) => {
      const ids = [...form.questionIds];
      const idx = ids.indexOf(id);
      if (idx > -1) {
        ids.splice(idx, 1);
        setForm((f) => ({ ...f, questionIds: ids }));
      } else {
        ids.push(id);
        const orderedIds = sortIdsByOrder(ids);
        setForm((f) => ({ ...f, questionIds: orderedIds }));
      }
      if (errors.questions) {
        setErrors((e) => {
          const newErrors = { ...e };
          delete newErrors.questions;
          return newErrors;
        });
      }
    };
    const selectAllQuestions = () => {
      const ids = visibleQuestions.map(({ data }) => data.id);
      setForm((f) => ({ ...f, questionIds: sortIdsByOrder(ids) }));
      if (errors.questions) {
        setErrors((e) => {
          const newErrors = { ...e };
          delete newErrors.questions;
          return newErrors;
        });
      }
    };
    const clearAllQuestions = () => {
      setForm((f) => ({ ...f, questionIds: [] }));
    };
    const handleCreate = async () => {
      const validationErrors = validateSession(form);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        toast("L\xFCtfen t\xFCm zorunlu alanlar\u0131 doldurun", "error");
        return;
      }
      setSaving(true);
      try {
        const currentUser = getCurrentUser();
        const companyId = getDbCompanyId();
        if (!companyId) {
          toast("Oturum olu\u015Fturmak i\xE7in bir \u015Firket se\xE7in", "error");
          return;
        }
        const creatorPin = (currentUser == null ? void 0 : currentUser.applicationPin) && /^\d{4}$/.test(currentUser.applicationPin) ? currentUser.applicationPin : "";
        if (!creatorPin) {
          toast("Quiz oturumu olu\u015Fturmadan \xF6nce profilinizden 4 haneli uygulama PIN\u2019i belirleyin.", "error");
          return;
        }
        const data = {
          employee: form.sessionMode === "open" ? {} : { fullName: form.employee.fullName.trim(), store: form.employee.store.trim() },
          createdBy: (currentUser == null ? void 0 : currentUser.uid) || null,
          createdByApplicationPin: creatorPin,
          questionIds: form.questionIds,
          sessionMode: form.sessionMode,
          timerMode: form.timerMode,
          totalTimerSeconds: form.timerMode === "total" ? Number(form.totalTimerSeconds) : null
        };
        const session = await window.db.addSession(data, companyId);
        const url = location.origin + location.pathname + "#/quiz/" + session.id;
        setQrUrl(url);
        setCreatedSessionId(session.id);
        setCreatedSessionMode(form.sessionMode);
        setTimeout(() => {
          if (qrRef.current) {
            qrRef.current.innerHTML = "";
            new QRCode(qrRef.current, { text: url, width: 200, height: 200 });
          }
        }, 100);
        toast("Quiz oturumu olu\u015Fturuldu", "success");
      } catch (e) {
        window.devError("Create session error:", e);
        toast("Oturum olu\u015Fturulurken hata olu\u015Ftu", "error");
      } finally {
        setSaving(false);
      }
    };
    const handleDelete = async (id) => {
      if (!confirm("Bu oturumu silmek istedi\u011Finizden emin misiniz?\n\n\u0130lgili t\xFCm test sonu\xE7lar\u0131 da silinecektir.")) return;
      try {
        const results = await window.db.getResults({ sessionId: id });
        await Promise.all(results.map((r) => window.db.deleteResult(r.id)));
        await window.db.deleteSession(id);
        if (results.length > 0) {
          toast(`Oturum ve ${results.length} test sonucu silindi`, "success");
        } else {
          toast("Oturum silindi", "success");
        }
      } catch (e) {
        window.devError("Delete session error:", e);
        toast("Oturum silinirken hata olu\u015Ftu: " + e.message, "error");
      }
    };
    const updateEmployee = (k, v) => {
      setForm((f) => ({ ...f, employee: { ...f.employee, [k]: v } }));
      if (errors[k]) {
        setErrors((e) => {
          const newErrors = { ...e };
          delete newErrors[k];
          return newErrors;
        });
      }
    };
    const openPackageModal = () => {
      setPackageForm({ name: "", questionIds: [] });
      setPackageErrors({});
      setPackageSearch("");
      setPackageFilters({ categories: [], difficulties: [], types: [], timers: [] });
      setPackageSort("order-asc");
      setShowPackageFilters(false);
      setShowPackageSort(false);
      setShowPackageModal(true);
    };
    const togglePackageQuestion = (questionId) => {
      setPackageForm((prev) => {
        const isSelected = prev.questionIds.includes(questionId);
        return {
          ...prev,
          questionIds: isSelected ? prev.questionIds.filter((id) => id !== questionId) : [...prev.questionIds, questionId]
        };
      });
    };
    const createPackage = async () => {
      const errors2 = {};
      if (!packageForm.name.trim()) {
        errors2.name = "Paket ad\u0131 gereklidir";
      }
      if (packageForm.questionIds.length === 0) {
        errors2.questionIds = "En az 1 soru se\xE7melisiniz";
      }
      if (Object.keys(errors2).length > 0) {
        setPackageErrors(errors2);
        toast("L\xFCtfen t\xFCm alanlar\u0131 doldurun", "error");
        return;
      }
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          toast("Kullan\u0131c\u0131 oturumu bulunamad\u0131", "error");
          return;
        }
        const companyId = getDbCompanyId();
        if (!companyId) {
          toast("L\xFCtfen paket olu\u015Fturmak i\xE7in bir \u015Firket se\xE7in", "warning");
          return;
        }
        const firstName = currentUser.firstName || "";
        const lastName = currentUser.lastName || "";
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
        const createdByName = fullName || currentUser.email || "Bilinmeyen";
        const packageData = {
          name: packageForm.name.trim(),
          questionIds: packageForm.questionIds,
          questionCount: packageForm.questionIds.length,
          createdBy: currentUser.uid,
          createdByName
        };
        await window.db.addPackage(packageData, companyId);
        toast("Paket ba\u015Far\u0131yla olu\u015Fturuldu", "success");
        setShowPackageModal(false);
        setPackageForm({ name: "", questionIds: [] });
        setPackageErrors({});
      } catch (e) {
        window.devError("Create package error:", e);
        toast("Paket olu\u015Fturulurken hata olu\u015Ftu: " + e.message, "error");
      }
    };
    const deletePackage = async (packageId) => {
      if (!confirm("Bu paketi silmek istedi\u011Finizden emin misiniz?")) return;
      try {
        await window.db.deletePackage(packageId);
        setPackages((prev) => prev.filter((p) => p.id !== packageId));
        if (selectedPackageId === packageId) {
          setSelectedPackageId(null);
        }
        toast("Paket silindi", "success");
      } catch (e) {
        window.devError("Delete package error:", e);
        toast("Paket silinirken hata olu\u015Ftu", "error");
      }
    };
    const selectPackage = (packageId) => {
      const pkg = packages.find((p) => p.id === packageId);
      if (!pkg) return;
      if (selectedPackageId === packageId) {
        setSelectedPackageId(null);
        setForm((prev) => ({ ...prev, questionIds: [] }));
      } else {
        setSelectedPackageId(packageId);
        setForm((prev) => ({ ...prev, questionIds: [...pkg.questionIds] }));
      }
    };
    if (loading) return /* @__PURE__ */ React.createElement(Page, { title: "Manager Panel" }, /* @__PURE__ */ React.createElement(LoadingSpinner, { text: "Veriler y\xFCkleniyor..." }));
    return /* @__PURE__ */ React.createElement(
      Page,
      {
        title: "Manager Panel",
        subtitle: `${sessions.length} oturum \u2022 ${questions.length} aktif soru`,
        extra: !showForm && !qrUrl && /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => setShowForm(true) }, "+ Yeni Quiz")
      },
      qrUrl ? /* @__PURE__ */ React.createElement("div", { className: "card p-8 space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("div", { className: "inline-block p-6 bg-white rounded-2xl shadow-card mb-4" }, /* @__PURE__ */ React.createElement("div", { ref: qrRef })), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-lg text-dark-900 mb-1" }, "Quiz Haz\u0131r!"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-600 mb-2" }, createdSessionMode === "open" ? "QR kodu payla\u015F\u0131n, kat\u0131l\u0131mc\u0131lar kendi bilgilerini girerek lobiye kat\u0131l\u0131r" : "Personel bu QR kodu okutarak quize ba\u015Flayabilir"), /* @__PURE__ */ React.createElement("a", { href: qrUrl, target: "_blank", className: "text-primary-500 text-sm hover:underline break-all" }, qrUrl)), createdSessionMode === "open" && /* @__PURE__ */ React.createElement("div", { className: "border-t pt-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-dark-900" }, "Lobi ", lobbyStartedAt ? lobbyTimeLeft > 0 ? `\u2014 ${lobbyTimeLeft} sn` : "\u2014 Ba\u015Fl\u0131yor..." : "\u2014 Bekleniyor"), /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue" }, lobbyParticipants.length, " kat\u0131l\u0131mc\u0131")), lobbyParticipants.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-400 text-center py-4" }, "Hen\xFCz kimse kat\u0131lmad\u0131") : /* @__PURE__ */ React.createElement("div", { className: "space-y-2 max-h-64 overflow-y-auto" }, lobbyParticipants.map((p) => /* @__PURE__ */ React.createElement("div", { key: p.id, className: "flex justify-between items-center px-3 py-2 rounded-lg bg-gray-50 border border-gray-100" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-sm text-dark-900" }, p.fullName), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-dark-500" }, p.store))))), /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: reset }, "Yeni Quiz Olu\u015Ftur"))) : showForm ? /* @__PURE__ */ React.createElement("div", { className: "card p-6 space-y-6" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-dark-900" }, "Yeni Quiz Oturumu"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-3 text-dark-700" }, "Oturum T\xFCr\xFC *"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: `session-type-card${form.sessionMode === "individual" && form.timerMode === "per_question" ? " active" : ""}`,
          onClick: () => setForm((f) => ({ ...f, sessionMode: "individual", timerMode: "per_question" }))
        },
        /* @__PURE__ */ React.createElement("div", { className: "session-type-icon" }, "\u23F1"),
        /* @__PURE__ */ React.createElement("div", { className: "session-type-title" }, "Bireysel"),
        /* @__PURE__ */ React.createElement("div", { className: "session-type-desc" }, "Soru Ba\u015F\u0131na S\xFCre")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: `session-type-card${form.sessionMode === "individual" && form.timerMode === "total" ? " active" : ""}`,
          onClick: () => setForm((f) => ({ ...f, sessionMode: "individual", timerMode: "total" }))
        },
        /* @__PURE__ */ React.createElement("div", { className: "session-type-icon" }, "\u23F0"),
        /* @__PURE__ */ React.createElement("div", { className: "session-type-title" }, "Bireysel"),
        /* @__PURE__ */ React.createElement("div", { className: "session-type-desc" }, "Toplam S\xFCre")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: `session-type-card${form.sessionMode === "open" ? " active" : ""}`,
          onClick: () => setForm((f) => ({ ...f, sessionMode: "open", timerMode: "per_question" }))
        },
        /* @__PURE__ */ React.createElement("div", { className: "session-type-icon" }, "\u{1F465}"),
        /* @__PURE__ */ React.createElement("div", { className: "session-type-title" }, "A\xE7\u0131k Oturum"),
        /* @__PURE__ */ React.createElement("div", { className: "session-type-desc" }, "\xC7ok Kat\u0131l\u0131mc\u0131l\u0131")
      )), form.sessionMode === "open" && /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mt-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: `btn text-sm px-4 py-2 ${form.timerMode === "per_question" ? "btn-primary" : "btn-ghost"}`,
          onClick: () => setForm((f) => ({ ...f, timerMode: "per_question" }))
        },
        "Soru Ba\u015F\u0131na S\xFCre"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: `btn text-sm px-4 py-2 ${form.timerMode === "total" ? "btn-primary" : "btn-ghost"}`,
          onClick: () => setForm((f) => ({ ...f, timerMode: "total" }))
        },
        "Toplam S\xFCre"
      )), form.timerMode === "total" && /* @__PURE__ */ React.createElement("div", { className: "mt-3" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-1 text-dark-700" }, "Toplam S\xFCre (dakika) *"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          min: "1",
          max: "180",
          className: `field w-40 ${errors.totalTimerSeconds ? "error" : ""}`,
          value: Math.round(form.totalTimerSeconds / 60) || "",
          onChange: (e) => setForm((f) => ({ ...f, totalTimerSeconds: Number(e.target.value) * 60 })),
          placeholder: "10"
        }
      ), errors.totalTimerSeconds && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, errors.totalTimerSeconds))), form.sessionMode !== "open" && /* @__PURE__ */ React.createElement("div", { className: "grid md:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Personel Ad\u0131 *"), /* @__PURE__ */ React.createElement(
        "input",
        {
          className: `field ${errors.fullName ? "error" : ""}`,
          value: form.employee.fullName,
          onChange: (e) => updateEmployee("fullName", e.target.value),
          placeholder: "\xDCmit TA\u015EDEM\u0130R"
        }
      ), errors.fullName && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, errors.fullName)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Ma\u011Faza *"), /* @__PURE__ */ React.createElement(
        "input",
        {
          className: `field ${errors.store ? "error" : ""}`,
          value: form.employee.store,
          onChange: (e) => updateEmployee("store", e.target.value),
          placeholder: "Midtown"
        }
      ), errors.store && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, errors.store))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-semibold text-dark-700" }, "Sorular Se\xE7 * (", form.questionIds.length, " soru se\xE7ildi)"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "btn btn-ghost text-xs px-3 py-1.5",
          onClick: selectAllQuestions,
          disabled: visibleQuestions.length === 0
        },
        "T\xFCm\xFCn\xFC Se\xE7"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "btn btn-ghost text-xs px-3 py-1.5",
          onClick: clearAllQuestions,
          disabled: form.questionIds.length === 0
        },
        "T\xFCm\xFCn\xFC Kald\u0131r"
      ))), /* @__PURE__ */ React.createElement("div", { className: "card p-4 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "question-search-icon" }, /* @__PURE__ */ React.createElement(MagnifyingGlassIcon, { size: 18, strokeWidth: 2 })), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "search",
          className: "w-full pl-10 pr-4 py-3 border rounded-full bg-white body-medium focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all",
          placeholder: animatedPlaceholder,
          value: search,
          onChange: (e) => setSearch(e.target.value),
          style: {
            borderColor: "#E0E0E0"
          }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "relative", ref: sortRef, title: "S\u0131rala" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "p-3 flex items-center justify-center rounded-full border bg-white hover:bg-primary-500 hover:text-white transition-all duration-200 relative",
          onClick: () => setShowSort((v) => !v),
          "data-question-sort-toggle": "true",
          style: { borderColor: "#E0E0E0" }
        },
        /* @__PURE__ */ React.createElement(BarsArrowUpIcon, { size: 20, strokeWidth: 2 })
      ), showSort && /* @__PURE__ */ React.createElement("div", { className: "question-filter-panel" }, /* @__PURE__ */ React.createElement("h3", { className: "title-small mb-3" }, "S\u0131rala"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, sortOptions.map((option) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: option.value,
          type: "button",
          className: `px-4 py-2 text-left rounded-lg transition-all ${sortOption === option.value ? "bg-primary-500 text-white font-semibold" : "bg-gray-50 hover:bg-gray-100 text-dark-700"}`,
          onClick: () => {
            setSortOption(option.value);
            setShowSort(false);
          }
        },
        option.label
      ))))), /* @__PURE__ */ React.createElement("div", { className: "relative", ref: filterRef, title: "Filtrele" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "p-3 flex items-center justify-center rounded-full border bg-white hover:bg-primary-500 hover:text-white transition-all duration-200 relative",
          onClick: () => setShowFilters((v) => !v),
          "data-question-filter-toggle": "true",
          style: { borderColor: "#E0E0E0" }
        },
        /* @__PURE__ */ React.createElement(FunnelIcon, { size: 20, strokeWidth: 2 }),
        activeFilterCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs label-small text-white bg-primary-500 rounded-full" }, activeFilterCount)
      ), showFilters && /* @__PURE__ */ React.createElement("div", { className: "question-filter-panel" }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-6 md:grid-cols-2" }, uniqueCategories.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "title-small" }, "Kategoriler"), /* @__PURE__ */ React.createElement("div", { className: "question-filter-options" }, uniqueCategories.map((category) => /* @__PURE__ */ React.createElement("label", { key: category, className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: filters.categories.includes(category),
          onChange: () => toggleFilter("categories", category)
        }
      ), /* @__PURE__ */ React.createElement("span", null, category))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "title-small" }, "Zorluk"), /* @__PURE__ */ React.createElement("div", { className: "question-filter-options" }, difficulties.map((diff) => /* @__PURE__ */ React.createElement("label", { key: diff.value, className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: filters.difficulties.includes(diff.value),
          onChange: () => toggleFilter("difficulties", diff.value)
        }
      ), /* @__PURE__ */ React.createElement("span", null, diff.label))))), uniqueTypes.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "title-small" }, "Soru Tipi"), /* @__PURE__ */ React.createElement("div", { className: "question-filter-options" }, uniqueTypes.map((type) => /* @__PURE__ */ React.createElement("label", { key: type, className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: filters.types.includes(type),
          onChange: () => toggleFilter("types", type)
        }
      ), /* @__PURE__ */ React.createElement("span", null, typeLabel(type)))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "title-small" }, "S\xFCre"), /* @__PURE__ */ React.createElement("div", { className: "question-filter-options" }, /* @__PURE__ */ React.createElement("label", { className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: filters.timers.includes("timed"),
          onChange: () => toggleFilter("timers", "timed")
        }
      ), /* @__PURE__ */ React.createElement("span", null, "S\xFCreli")), /* @__PURE__ */ React.createElement("label", { className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: filters.timers.includes("untimed"),
          onChange: () => toggleFilter("timers", "untimed")
        }
      ), /* @__PURE__ */ React.createElement("span", null, "S\xFCresiz"))))), (activeFilterCount > 0 || search.trim()) && /* @__PURE__ */ React.createElement("div", { className: "flex justify-end mt-4" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn btn-ghost text-sm", onClick: resetFilters }, "Temizle"))))), /* @__PURE__ */ React.createElement("div", { className: "mt-3 text-xs text-dark-600" }, visibleQuestions.length, " / ", questions.length, " soru g\xF6steriliyor"), (packages.length > 0 || true) && /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-4 border-t border-dark-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-dark-700" }, "\u{1F4E6} H\u0131zl\u0131 Paketler:")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "package-chip package-chip-create",
          onClick: openPackageModal,
          title: "Yeni paket olu\u015Ftur"
        },
        /* @__PURE__ */ React.createElement("span", null, "+ Paket Olu\u015Ftur")
      ), packages.map((pkg) => {
        const currentUser = getCurrentUser();
        const isOwner = pkg.createdBy === (currentUser == null ? void 0 : currentUser.uid);
        const isAdmin = (currentUser == null ? void 0 : currentUser.role) === "admin";
        const isSuperAdmin = (currentUser == null ? void 0 : currentUser.isSuperAdmin) === true;
        const canDelete = isOwner || isAdmin || isSuperAdmin;
        const roleDisplay = pkg.createdByRole === "admin" ? "Admin" : pkg.createdByRole === "manager" ? "Manager" : pkg.createdByRole === "SuperAdmin" ? "S\xFCper Admin" : pkg.createdByRole || "-";
        const tooltipText = `${pkg.createdByName || "Bilinmeyen"} | ${roleDisplay} | ${pkg.company || "-"}`;
        return /* @__PURE__ */ React.createElement("div", { key: pkg.id, className: "relative group" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: `package-chip ${selectedPackageId === pkg.id ? "active" : ""}`,
            onClick: () => selectPackage(pkg.id),
            title: tooltipText
          },
          /* @__PURE__ */ React.createElement("span", null, pkg.name),
          /* @__PURE__ */ React.createElement("span", { className: "text-xs opacity-70" }, "(", pkg.questionCount, ")"),
          !isOwner && /* @__PURE__ */ React.createElement("span", { className: "text-xs opacity-50 ml-1" }, "\u{1F464}")
        ), canDelete && /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
            onClick: (e) => {
              e.stopPropagation();
              deletePackage(pkg.id);
            },
            title: "Paketi sil"
          },
          "\xD7"
        ));
      })))), errors.questions && /* @__PURE__ */ React.createElement("div", { className: "error-text mb-2" }, errors.questions), /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 max-h-96 overflow-y-auto p-2" }, visibleQuestions.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-8 text-dark-500" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm mb-2" }, questions.length === 0 ? "Aktif soru bulunmuyor" : "Filtrelere uygun soru bulunamad\u0131"), questions.length === 0 ? /* @__PURE__ */ React.createElement("a", { href: "#/admin", className: "btn btn-secondary mt-4" }, "Soru Ekle") : /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "btn btn-secondary text-xs px-3 py-1.5 mt-2",
          onClick: resetFilters
        },
        "Filtreleri Temizle"
      )) : visibleQuestions.map(({ data, orderNumber }) => /* @__PURE__ */ React.createElement(
        "label",
        {
          key: data.id,
          className: "option-card " + (form.questionIds.includes(data.id) ? "selected" : ""),
          style: { cursor: "pointer" }
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "checkbox",
            checked: form.questionIds.includes(data.id),
            onChange: () => toggleQ(data.id),
            className: "mt-1 w-5 h-5 flex-shrink-0",
            style: { cursor: "pointer" }
          }
        ), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "chip bg-gray-200 text-gray-700 text-xs" }, "#", orderNumber), data.category && /* @__PURE__ */ React.createElement("span", { className: "chip chip-orange text-xs" }, data.category), /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue text-xs" }, typeLabel(data.type)), data.difficulty && /* @__PURE__ */ React.createElement("span", { className: "chip bg-gray-200 text-gray-600 text-xs" }, data.difficulty === "easy" ? "Kolay" : data.difficulty === "medium" ? "Orta" : "Zor"), data.hasTimer && Number(data.timerSeconds) > 0 ? /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue text-xs inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(ClockIcon, { size: 12, strokeWidth: 2 }), " ", data.timerSeconds, " sn") : /* @__PURE__ */ React.createElement("span", { className: "chip bg-gray-100 text-gray-500 text-xs" }, "S\xFCresiz")), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-dark-900 break-words" }, data.questionText)))
      )))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-2" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleCreate, disabled: saving }, saving ? "Olu\u015Fturuluyor..." : "Olu\u015Ftur & QR G\xF6ster"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-ghost", onClick: reset, disabled: saving }, "\u0130ptal"))) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4" }, sessions.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "card p-12 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-6xl mb-4" }, /* @__PURE__ */ React.createElement(ChartBarIcon, { size: 64, strokeWidth: 1.5, className: "inline text-primary-500" })), /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-lg" }, "Hen\xFCz quiz oturumu olu\u015Fturulmam\u0131\u015F"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary mt-4", onClick: () => setShowForm(true) }, "\u0130lk Oturumu Olu\u015Ftur")) : sessions.map((s) => {
        var _a, _b;
        return /* @__PURE__ */ React.createElement("div", { key: s.id, className: "card p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col lg:flex-row justify-between items-start gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0 w-full" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" }, /* @__PURE__ */ React.createElement("span", { className: `chip ${s.status === "completed" ? "chip-green" : "chip-orange"}` }, s.status === "completed" ? "Tamamland\u0131" : "Bekliyor"), s.sessionMode === "open" ? /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue" }, "\u{1F465} A\xE7\u0131k Oturum") : /* @__PURE__ */ React.createElement("span", { className: "chip bg-gray-100 text-gray-600" }, s.timerMode === "total" ? "\u23F0 Toplam S\xFCre" : "\u23F1 Soru Ba\u015F\u0131na S\xFCre")), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-lg text-dark-900 break-words" }, s.sessionMode === "open" ? "A\xE7\u0131k Oturum" : ((_a = s.employee) == null ? void 0 : _a.fullName) || "-"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-600 break-words" }, s.sessionMode === "open" ? s.timerMode === "total" ? `Toplam s\xFCre: ${Math.round((s.totalTimerSeconds || 600) / 60)} dk` : "Soru ba\u015F\u0131na s\xFCreli" : ((_b = s.employee) == null ? void 0 : _b.store) || "-"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dark-400 mt-2" }, (s.questionIds || []).length, " soru \u2022 ", fmtDate(s.createdAt))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 flex-shrink-0" }, /* @__PURE__ */ React.createElement("a", { href: "#/quiz/" + s.id, className: "btn btn-secondary text-sm px-3 py-2 flex items-center gap-1", target: "_blank" }, /* @__PURE__ */ React.createElement(LinkIcon, { size: 16, strokeWidth: 2 }), " A\xE7"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-danger text-sm px-3 py-2", onClick: () => handleDelete(s.id), title: "Sil" }, /* @__PURE__ */ React.createElement(TrashIcon, { size: 16, strokeWidth: 2 })))));
      })),
      showPackageModal && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "overlay open", onClick: () => setShowPackageModal(false) }), /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "modal-lg open",
          style: {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 999,
            background: "white",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            maxWidth: "700px",
            width: "95%",
            maxHeight: "85vh",
            overflowY: "auto"
          }
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-dark-900 flex items-center gap-2" }, "\u{1F4E6} Yeni Soru Paketi Olu\u015Ftur"), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "text-dark-400 hover:text-dark-900 text-2xl",
            onClick: () => setShowPackageModal(false)
          },
          "\xD7"
        )),
        /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Paket Ad\u0131 *"), /* @__PURE__ */ React.createElement(
          "input",
          {
            className: `field ${packageErrors.name ? "error" : ""}`,
            value: packageForm.name,
            onChange: (e) => setPackageForm((prev) => ({ ...prev, name: e.target.value })),
            placeholder: "\xF6r: \xDCr\xFCn Bilgisi - Temel Seviye",
            autoFocus: true
          }
        ), packageErrors.name && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, packageErrors.name)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Sorularda Ara ve Filtrele"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "question-search-icon" }, /* @__PURE__ */ React.createElement(MagnifyingGlassIcon, { size: 18, strokeWidth: 2 })), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "search",
            className: "w-full pl-10 pr-4 py-2 border rounded-lg bg-white body-medium focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all",
            placeholder: "Soru metninde ara...",
            value: packageSearch,
            onChange: (e) => setPackageSearch(e.target.value)
          }
        )), /* @__PURE__ */ React.createElement("div", { className: "relative", ref: packageSortRef, title: "S\u0131rala" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "p-2 flex items-center justify-center rounded-full border bg-white hover:bg-primary-500 hover:text-white transition-all duration-200 relative",
            onClick: () => setShowPackageSort((v) => !v),
            "data-package-sort-toggle": "true",
            style: { borderColor: "#E0E0E0" }
          },
          /* @__PURE__ */ React.createElement(BarsArrowUpIcon, { size: 20, strokeWidth: 2 })
        ), showPackageSort && /* @__PURE__ */ React.createElement("div", { className: "question-filter-panel", style: { right: 0, left: "auto" } }, /* @__PURE__ */ React.createElement("h3", { className: "title-small mb-3" }, "S\u0131rala"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2" }, sortOptions.map((option) => /* @__PURE__ */ React.createElement(
          "button",
          {
            key: option.value,
            type: "button",
            className: `px-4 py-2 text-left rounded-lg transition-all ${packageSort === option.value ? "bg-primary-500 text-white font-semibold" : "bg-gray-50 hover:bg-gray-100 text-dark-700"}`,
            onClick: () => {
              setPackageSort(option.value);
              setShowPackageSort(false);
            }
          },
          option.label
        ))))), /* @__PURE__ */ React.createElement("div", { className: "relative", ref: packageFilterRef, title: "Filtrele" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "p-2 flex items-center justify-center rounded-full border bg-white hover:bg-primary-500 hover:text-white transition-all duration-200 relative",
            onClick: () => setShowPackageFilters((v) => !v),
            "data-package-filter-toggle": "true",
            style: { borderColor: "#E0E0E0" }
          },
          /* @__PURE__ */ React.createElement(FunnelIcon, { size: 20, strokeWidth: 2 }),
          activePackageFilterCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs label-small text-white bg-primary-500 rounded-full" }, activePackageFilterCount)
        ), showPackageFilters && /* @__PURE__ */ React.createElement("div", { className: "question-filter-panel", style: { right: 0, left: "auto", minWidth: "500px" } }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-6 md:grid-cols-2" }, uniqueCategories.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "title-small" }, "Kategoriler"), /* @__PURE__ */ React.createElement("div", { className: "question-filter-options" }, uniqueCategories.map((category) => /* @__PURE__ */ React.createElement("label", { key: category, className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "checkbox",
            checked: packageFilters.categories.includes(category),
            onChange: () => togglePackageFilter("categories", category)
          }
        ), /* @__PURE__ */ React.createElement("span", null, category))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "title-small" }, "Zorluk"), /* @__PURE__ */ React.createElement("div", { className: "question-filter-options" }, difficulties.map((diff) => /* @__PURE__ */ React.createElement("label", { key: diff.value, className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "checkbox",
            checked: packageFilters.difficulties.includes(diff.value),
            onChange: () => togglePackageFilter("difficulties", diff.value)
          }
        ), /* @__PURE__ */ React.createElement("span", null, diff.label))))), uniqueTypes.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "title-small" }, "Soru Tipi"), /* @__PURE__ */ React.createElement("div", { className: "question-filter-options" }, uniqueTypes.map((type) => /* @__PURE__ */ React.createElement("label", { key: type, className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "checkbox",
            checked: packageFilters.types.includes(type),
            onChange: () => togglePackageFilter("types", type)
          }
        ), /* @__PURE__ */ React.createElement("span", null, typeLabel(type)))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "title-small" }, "S\xFCre"), /* @__PURE__ */ React.createElement("div", { className: "question-filter-options" }, /* @__PURE__ */ React.createElement("label", { className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "checkbox",
            checked: packageFilters.timers.includes("timed"),
            onChange: () => togglePackageFilter("timers", "timed")
          }
        ), /* @__PURE__ */ React.createElement("span", null, "S\xFCreli")), /* @__PURE__ */ React.createElement("label", { className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "checkbox",
            checked: packageFilters.timers.includes("untimed"),
            onChange: () => togglePackageFilter("timers", "untimed")
          }
        ), /* @__PURE__ */ React.createElement("span", null, "S\xFCresiz"))))), (activePackageFilterCount > 0 || packageSearch.trim()) && /* @__PURE__ */ React.createElement("div", { className: "flex justify-end mt-4" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn btn-ghost text-sm", onClick: resetPackageFilters }, "Temizle"))))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-xs text-dark-600" }, visiblePackageQuestions.length, " / ", questions.length, " soru g\xF6steriliyor")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-dark-700" }, "Se\xE7ilen: ", packageForm.questionIds.length, " soru"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "btn btn-ghost text-xs px-3 py-1.5",
            onClick: () => setPackageForm((prev) => ({ ...prev, questionIds: visiblePackageQuestions.map((q) => q.data.id) }))
          },
          "T\xFCm\xFCn\xFC Se\xE7"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "btn btn-ghost text-xs px-3 py-1.5",
            onClick: () => setPackageForm((prev) => ({ ...prev, questionIds: [] })),
            disabled: packageForm.questionIds.length === 0
          },
          "T\xFCm\xFCn\xFC Kald\u0131r"
        ))), packageErrors.questionIds && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, packageErrors.questionIds), /* @__PURE__ */ React.createElement("div", { className: "grid gap-2 max-h-96 overflow-y-auto p-2 border rounded-lg" }, visiblePackageQuestions.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-8 text-dark-500" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm" }, questions.length === 0 ? "Aktif soru bulunmuyor" : "Filtrelere uygun soru bulunamad\u0131")) : visiblePackageQuestions.map(({ data, orderNumber }) => /* @__PURE__ */ React.createElement(
          "label",
          {
            key: data.id,
            className: "option-card " + (packageForm.questionIds.includes(data.id) ? "selected" : ""),
            style: { cursor: "pointer" }
          },
          /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement(
            "input",
            {
              type: "checkbox",
              checked: packageForm.questionIds.includes(data.id),
              onChange: () => togglePackageQuestion(data.id),
              className: "mt-1 w-5 h-5 flex-shrink-0",
              style: { cursor: "pointer" }
            }
          ), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "chip bg-gray-200 text-gray-700 text-xs" }, "#", orderNumber), data.category && /* @__PURE__ */ React.createElement("span", { className: "chip chip-orange text-xs" }, data.category), /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue text-xs" }, typeLabel(data.type)), data.difficulty && /* @__PURE__ */ React.createElement("span", { className: "chip bg-gray-200 text-gray-600 text-xs" }, data.difficulty === "easy" ? "Kolay" : data.difficulty === "medium" ? "Orta" : "Zor")), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-dark-900 break-words" }, data.questionText)))
        ))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-4 border-t" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-primary",
            onClick: createPackage,
            disabled: packageForm.questionIds.length === 0
          },
          "Olu\u015Ftur (",
          packageForm.questionIds.length,
          " soru)"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-ghost",
            onClick: () => setShowPackageModal(false)
          },
          "\u0130ptal"
        )))
      ))
    );
  };
  window.Manager = Manager;
})();
