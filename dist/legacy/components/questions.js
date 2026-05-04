(() => {
  const { useState, useEffect, useMemo, useRef } = React;
  const QuestionBank = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [showSort, setShowSort] = useState(false);
    const [filters, setFilters] = useState({
      categories: [],
      difficulties: [],
      statuses: [],
      types: [],
      timers: []
    });
    const [sortOption, setSortOption] = useState("order-asc");
    const filterRef = useRef(null);
    const sortRef = useRef(null);
    const animatedPlaceholder = useAnimatedPlaceholder();
    useEffect(() => {
      let unsubscribe = null;
      const getCompanyId = () => {
        const cu = getCurrentUser();
        if (!cu) return void 0;
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
      const loadQuestions = () => {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          setLoading(false);
          return;
        }
        const companyId = getCompanyId();
        if (!companyId && !currentUser.isSuperAdmin) {
          setQuestions([]);
          setLoading(false);
          return;
        }
        unsubscribe = window.db.onQuestionsSnapshot(companyId, (data) => {
          const ordered = data.map((q, index) => ({ ...q, __originalIndex: index })).sort((a, b) => {
            const orderA = typeof a.order === "number" ? a.order : a.__originalIndex;
            const orderB = typeof b.order === "number" ? b.order : b.__originalIndex;
            return orderA - orderB;
          }).map(({ __originalIndex, ...rest }) => rest);
          setQuestions(ordered);
          setLoading(false);
        });
      };
      loadQuestions();
      const handleCompanyChange = () => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
        setLoading(true);
        loadQuestions();
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
        window.removeEventListener("company-changed", handleCompanyChange);
      };
    }, []);
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (event.target.closest("[data-question-filter-toggle]")) return;
        if (event.target.closest("[data-question-sort-toggle]")) return;
        if (showFilters && filterRef.current && !filterRef.current.contains(event.target)) {
          setShowFilters(false);
        }
        if (showSort && sortRef.current && !sortRef.current.contains(event.target)) {
          setShowSort(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showFilters, showSort]);
    const uniqueCategories = useMemo(() => {
      return [...new Set(questions.map((q) => q.category).filter(Boolean))].sort();
    }, [questions]);
    const uniqueTypes = useMemo(() => {
      return [...new Set(questions.map((q) => q.type).filter(Boolean))];
    }, [questions]);
    const difficulties = useMemo(() => [
      { value: "easy", label: "Kolay" },
      { value: "medium", label: "Orta" },
      { value: "hard", label: "Zor" }
    ], []);
    const stats = useMemo(() => {
      return questions.reduce((acc, q) => {
        if (q.isActive) acc.active += 1;
        else acc.inactive += 1;
        if (q.hasTimer) acc.timed += 1;
        return acc;
      }, { active: 0, inactive: 0, timed: 0 });
    }, [questions]);
    const toggleFilter = (type, value) => {
      setFilters((prev) => ({
        ...prev,
        [type]: prev[type].includes(value) ? prev[type].filter((v) => v !== value) : [...prev[type], value]
      }));
    };
    const clearFilters = () => {
      setFilters({ categories: [], difficulties: [], statuses: [], types: [], timers: [] });
    };
    const resetAll = () => {
      setSearch("");
      clearFilters();
      setShowFilters(false);
    };
    const activeFilterCount = filters.categories.length + filters.difficulties.length + filters.statuses.length + filters.types.length + filters.timers.length;
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
        if (filters.statuses.length > 0) {
          const status = data.isActive ? "active" : "inactive";
          if (!filters.statuses.includes(status)) {
            return false;
          }
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
            return (a.data.questionText || "").localeCompare(b.data.questionText || "") || a.orderNumber - b.orderNumber;
          case "text-desc":
            return (b.data.questionText || "").localeCompare(a.data.questionText || "") || a.orderNumber - b.orderNumber;
          case "created-desc":
            return toMillis(b.data.createdAt) - toMillis(a.data.createdAt);
          case "created-asc":
            return toMillis(a.data.createdAt) - toMillis(b.data.createdAt);
          case "difficulty-easy":
            return (difficultyOrder[a.data.difficulty] || 2) - (difficultyOrder[b.data.difficulty] || 2) || a.orderNumber - b.orderNumber;
          case "difficulty-hard":
            return (difficultyOrder[b.data.difficulty] || 2) - (difficultyOrder[a.data.difficulty] || 2) || a.orderNumber - b.orderNumber;
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
    }, [questions, search, filters, sortOption]);
    if (loading) {
      return /* @__PURE__ */ React.createElement(Page, { title: "Sorular" }, /* @__PURE__ */ React.createElement(LoadingSpinner, { text: "Sorular y\xFCkleniyor..." }));
    }
    return /* @__PURE__ */ React.createElement(
      Page,
      {
        title: "Sorular",
        subtitle: `${visibleQuestions.length} / ${questions.length} soru g\xF6steriliyor`,
        extra: /* @__PURE__ */ React.createElement("div", { className: "text-right text-sm text-dark-500 leading-5" }, /* @__PURE__ */ React.createElement("div", null, "Aktif: ", /* @__PURE__ */ React.createElement("strong", { className: "text-dark-800" }, stats.active)), /* @__PURE__ */ React.createElement("div", null, "Pasif: ", /* @__PURE__ */ React.createElement("strong", { className: "text-dark-800" }, stats.inactive)), /* @__PURE__ */ React.createElement("div", null, "Zamanlay\u0131c\u0131l\u0131: ", /* @__PURE__ */ React.createElement("strong", { className: "text-dark-800" }, stats.timed)))
      },
      /* @__PURE__ */ React.createElement("div", { className: "card p-4 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "question-search-icon" }, /* @__PURE__ */ React.createElement(MagnifyingGlassIcon, { size: 18, strokeWidth: 2 })), /* @__PURE__ */ React.createElement(
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
      ), /* @__PURE__ */ React.createElement("span", null, diff.label))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "title-small" }, "Durum"), /* @__PURE__ */ React.createElement("div", { className: "question-filter-options" }, /* @__PURE__ */ React.createElement("label", { className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: filters.statuses.includes("active"),
          onChange: () => toggleFilter("statuses", "active")
        }
      ), /* @__PURE__ */ React.createElement("span", null, "Aktif")), /* @__PURE__ */ React.createElement("label", { className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: filters.statuses.includes("inactive"),
          onChange: () => toggleFilter("statuses", "inactive")
        }
      ), /* @__PURE__ */ React.createElement("span", null, "Pasif")))), uniqueTypes.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "title-small" }, "Soru Tipi"), /* @__PURE__ */ React.createElement("div", { className: "question-filter-options" }, uniqueTypes.map((type) => /* @__PURE__ */ React.createElement("label", { key: type, className: "question-filter-option" }, /* @__PURE__ */ React.createElement(
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
      ), /* @__PURE__ */ React.createElement("span", null, "S\xFCresiz"))))), (activeFilterCount > 0 || search.trim()) && /* @__PURE__ */ React.createElement("div", { className: "flex justify-end mt-4" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn btn-ghost text-sm", onClick: resetAll }, "Temizle")))), (search.trim() || activeFilterCount > 0) && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "btn btn-ghost px-3 py-2 text-sm",
          onClick: resetAll
        },
        "Temizle"
      ))),
      visibleQuestions.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "card p-10 text-center text-dark-500" }, /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement(MagnifyingGlassIcon, { size: 64, strokeWidth: 1.5, className: "inline text-dark-400" })), /* @__PURE__ */ React.createElement("p", null, "Filtrelere uygun soru bulunamad\u0131."), (search.trim() || activeFilterCount > 0) && /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn btn-secondary mt-4", onClick: resetAll }, "Filtreleri Temizle")) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4" }, visibleQuestions.map(({ data }) => /* @__PURE__ */ React.createElement("div", { key: data.id, className: "card p-6 question-bank-card" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, data.type && /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue" }, typeLabel(data.type)), data.category && /* @__PURE__ */ React.createElement("span", { className: "chip chip-orange" }, data.category), data.difficulty && /* @__PURE__ */ React.createElement("span", { className: "chip bg-gray-200 text-gray-600" }, data.difficulty === "easy" ? "Kolay" : data.difficulty === "medium" ? "Orta" : "Zor"), /* @__PURE__ */ React.createElement("span", { className: `chip ${data.isActive ? "chip-green" : "chip-orange"}` }, data.isActive ? "Aktif" : "Pasif"), data.hasTimer && data.timerSeconds > 0 && /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(ClockIcon, { size: 14, strokeWidth: 2 }), " ", data.timerSeconds, " sn")), data.questionImageUrl && /* @__PURE__ */ React.createElement("div", { className: "question-bank-image" }, /* @__PURE__ */ React.createElement("img", { src: data.questionImageUrl, alt: "Soru g\xF6rseli", loading: "lazy" })), /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-dark-900" }, data.questionText), data.type === "mcq" ? /* @__PURE__ */ React.createElement("ul", { className: `question-bank-options ${data.hasImageOptions ? "has-image-options" : ""}` }, (data.options || []).filter(Boolean).map((option, index) => {
        const isCorrect = data.correctAnswer && data.correctAnswer === option;
        const imageUrl = data.hasImageOptions && Array.isArray(data.optionImageUrls) ? data.optionImageUrls[index] : null;
        return /* @__PURE__ */ React.createElement("li", { key: index, className: `question-bank-option ${isCorrect ? "correct" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "question-bank-option-header" }, /* @__PURE__ */ React.createElement("span", { className: "option-index" }, String.fromCharCode(65 + index)), /* @__PURE__ */ React.createElement("span", { className: "option-text" }, option), isCorrect && /* @__PURE__ */ React.createElement("span", { className: "option-correct inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(CheckIcon, { size: 14, strokeWidth: 2 }), " Do\u011Fru")), imageUrl && /* @__PURE__ */ React.createElement("div", { className: "option-image" }, /* @__PURE__ */ React.createElement("img", { src: imageUrl, alt: `Se\xE7enek ${index + 1}`, loading: "lazy" })));
      })) : data.correctAnswer ? /* @__PURE__ */ React.createElement("div", { className: "question-bank-answer" }, /* @__PURE__ */ React.createElement("span", { className: "option-index" }, /* @__PURE__ */ React.createElement(CheckIcon, { size: 18, strokeWidth: 2 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "option-label" }, "Beklenen Yan\u0131t"), /* @__PURE__ */ React.createElement("div", { className: "option-text" }, data.correctAnswer))) : null, /* @__PURE__ */ React.createElement("div", { className: "question-bank-meta" }, /* @__PURE__ */ React.createElement("span", null, "Olu\u015Fturulma: ", /* @__PURE__ */ React.createElement("strong", null, fmtDate(data.createdAt))), /* @__PURE__ */ React.createElement("span", null, "G\xFCncelleme: ", /* @__PURE__ */ React.createElement("strong", null, fmtDate(data.updatedAt || data.createdAt))), /* @__PURE__ */ React.createElement("span", null, "ID: ", /* @__PURE__ */ React.createElement("code", null, data.id)))))))
    );
  };
  window.QuestionBank = QuestionBank;
})();
