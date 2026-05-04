(() => {
  const QuestionList = ({ questions, handleEdit, handleDelete, toggleActive, onCreateNew }) => {
    const { useState, useEffect, useRef, useMemo } = React;
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
      setFilters({ categories: [], difficulties: [], statuses: [], types: [], timers: [] });
    };
    const resetAll = () => {
      setSearch("");
      clearFilters();
      setShowFilters(false);
    };
    const activeFilterCount = filters.categories.length + filters.difficulties.length + filters.statuses.length + filters.types.length + filters.timers.length;
    const getDisplayOrder = (question, index) => {
      return typeof question.order === "number" ? question.order + 1 : index + 1;
    };
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
    }, [questions, filters, search, sortOption]);
    if (questions.length === 0) {
      return /* @__PURE__ */ React.createElement("div", { className: "card p-12 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-6xl mb-4" }, "\u{1F4DD}"), /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-lg" }, "Hen\xFCz soru eklenmemi\u015F"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary mt-4", onClick: onCreateNew }, "\u0130lk Soruyu Ekle"));
    }
    const QuestionCard = ({ question, displayOrder }) => /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col lg:flex-row justify-between items-start gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-4 w-full" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center gap-1 pt-1 text-dark-400" }, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 font-semibold" }, displayOrder)), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0 w-full" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-2 flex-wrap" }, /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue" }, typeLabel(question.type)), question.category && /* @__PURE__ */ React.createElement("span", { className: "chip chip-orange" }, question.category), question.difficulty && /* @__PURE__ */ React.createElement("span", { className: "chip bg-gray-200 text-gray-600" }, question.difficulty === "easy" ? "Kolay" : question.difficulty === "medium" ? "Orta" : "Zor"), /* @__PURE__ */ React.createElement("span", { className: `chip ${question.isActive ? "chip-green" : "chip-orange"}` }, question.isActive ? "Aktif" : "Pasif"), question.hasTimer && Number(question.timerSeconds) > 0 && /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue" }, question.timerSeconds, " sn")), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-lg text-dark-900 mb-2 break-words", dangerouslySetInnerHTML: { __html: sanitizeHTML(question.questionText) } }), question.type === "mcq" && question.options && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-dark-600 mt-2 break-words" }, /* @__PURE__ */ React.createElement("b", null, "Se\xE7enekler:"), " ", /* @__PURE__ */ React.createElement("span", { dangerouslySetInnerHTML: { __html: sanitizeHTML(question.options.join(" \u2022 ")) } }), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("b", null, "Do\u011Fru:"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-accent-600 font-semibold break-words", dangerouslySetInnerHTML: { __html: sanitizeHTML(question.correctAnswer) } })), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-400 mt-2" }, "Olu\u015Fturulma: ", fmtDate(question.createdAt)))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center gap-1 justify-center" }, /* @__PURE__ */ React.createElement("label", { className: "toggle-switch" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: question.isActive, onChange: () => toggleActive(question.id, question.isActive) }), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" })), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-dark-500" }, question.isActive ? "Aktif" : "Pasif")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2 items-stretch" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-ghost text-sm px-3 py-2", onClick: () => handleEdit(question) }, "D\xFCzenle"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-danger text-sm px-3 py-2", onClick: () => handleDelete(question.id) }, "Sil")))));
    return /* @__PURE__ */ React.createElement("div", { className: "grid gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "card p-4 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "question-search-icon" }, /* @__PURE__ */ React.createElement(MagnifyingGlassIcon, { size: 18, strokeWidth: 2 })), /* @__PURE__ */ React.createElement(
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
    ))), visibleQuestions.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "card p-12 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-6xl mb-4" }, "\u{1F50D}"), /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-lg" }, "Filtrelere uygun soru bulunamad\u0131."), (search.trim() || activeFilterCount > 0) && /* @__PURE__ */ React.createElement("button", { type: "button", className: "btn btn-secondary mt-4", onClick: resetAll }, "Filtreleri Temizle")) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4" }, visibleQuestions.map(({ data, orderNumber }) => /* @__PURE__ */ React.createElement(QuestionCard, { key: data.id, question: data, displayOrder: orderNumber }))));
  };
  window.QuestionList = QuestionList;
})();
