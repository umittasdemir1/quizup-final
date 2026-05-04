(() => {
  const { useState, useEffect } = React;
  const Dashboard = () => {
    const DASHBOARD_QUERY_LIMIT = 500;
    const [questions, setQuestions] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const loadData = async () => {
      setLoading(true);
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          setLoading(false);
          return;
        }
        if (!window.supabase) {
          throw new Error("Supabase client haz\u0131r de\u011Fil");
        }
        const selectedCompany = getSelectedCompany();
        const shouldFilterByCompany = !currentUser.isSuperAdmin || selectedCompany && selectedCompany !== "all";
        const companyId = shouldFilterByCompany ? currentUser.isSuperAdmin ? selectedCompany : currentUser.companyId : null;
        let questionsQuery = window.supabase.from("questions").select("*").order("created_at", { ascending: false }).limit(DASHBOARD_QUERY_LIMIT);
        let sessionsQuery = window.supabase.from("quiz_sessions").select("*").order("created_at", { ascending: false }).limit(DASHBOARD_QUERY_LIMIT);
        let resultsQuery = window.supabase.from("results").select("*").order("created_at", { ascending: false }).limit(DASHBOARD_QUERY_LIMIT);
        if (companyId) {
          questionsQuery = questionsQuery.eq("company_id", companyId);
          sessionsQuery = sessionsQuery.eq("company_id", companyId);
          resultsQuery = resultsQuery.eq("company_id", companyId);
        }
        const [questionsResult, sessionsResult, resultsResult] = await Promise.all([
          questionsQuery,
          sessionsQuery,
          resultsQuery
        ]);
        if (questionsResult.error) throw questionsResult.error;
        if (sessionsResult.error) throw sessionsResult.error;
        if (resultsResult.error) throw resultsResult.error;
        const normalizeQuestion = (q) => ({
          id: q.id,
          company: q.company_id,
          questionText: q.question_text,
          type: q.type,
          category: q.category,
          difficulty: q.difficulty,
          options: q.options || [],
          correctAnswer: q.correct_answer,
          isActive: q.is_active,
          hasTimer: q.has_timer,
          timerSeconds: q.timer_seconds,
          questionImageUrl: q.question_image_url,
          hasQuestionImage: q.has_question_image,
          hasImageOptions: q.has_image_options,
          optionImageUrls: q.option_image_urls || [],
          createdAt: q.created_at
        });
        const normalizeSession = (s) => ({
          id: s.id,
          company: s.company_id,
          employee: s.employee || {},
          questionIds: s.question_ids || [],
          status: s.status,
          createdAt: s.created_at,
          completedAt: s.completed_at
        });
        const normalizeResult = (r) => ({
          id: r.id,
          company: r.company_id,
          sessionId: r.session_id,
          employee: r.employee || {},
          answers: r.answers || {},
          score: r.score || {},
          timeTracking: r.time_tracking || {},
          location: r.location || {},
          submittedAt: r.submitted_at,
          createdAt: r.created_at
        });
        setQuestions((questionsResult.data || []).map(normalizeQuestion));
        setSessions((sessionsResult.data || []).map(normalizeSession));
        setResults((resultsResult.data || []).map(normalizeResult));
        if (companyId && currentUser.isSuperAdmin) {
          try {
            localStorage.setItem("superadmin:selectedCompany", companyId);
          } catch {
          }
        }
      } catch (e) {
        window.devError("Dashboard load error:", e);
        toast("Dashboard y\xFCklenirken hata olu\u015Ftu", "error");
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      loadData();
      const handleCompanyChange = () => {
        loadData();
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => window.removeEventListener("company-changed", handleCompanyChange);
    }, []);
    if (loading) return /* @__PURE__ */ React.createElement(Page, { title: "Dashboard" }, /* @__PURE__ */ React.createElement(LoadingSpinner, { text: "Dashboard y\xFCkleniyor..." }));
    const totalQuestions = questions.length;
    const activeQuestions = questions.filter((q) => q.isActive).length;
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.status === "completed").length;
    const totalResults = results.length;
    const avgScore = results.length > 0 ? Math.round(results.reduce((sum, r) => {
      var _a;
      return sum + (((_a = r.score) == null ? void 0 : _a.percent) || 0);
    }, 0) / results.length) : 0;
    const resultsWithTime = results.filter((r) => {
      var _a;
      return (_a = r.timeTracking) == null ? void 0 : _a.totalTime;
    });
    const avgQuizTime = resultsWithTime.length > 0 ? Math.round(resultsWithTime.reduce((sum, r) => sum + r.timeTracking.totalTime, 0) / resultsWithTime.length) : 0;
    const avgQuestionTime = resultsWithTime.length > 0 ? Math.round(resultsWithTime.reduce((sum, r) => sum + (r.timeTracking.averageTimePerQuestion || 0), 0) / resultsWithTime.length) : 0;
    const resultsWithLocation = results.filter((r) => {
      var _a;
      return (_a = r.location) == null ? void 0 : _a.city;
    });
    const cityStats = {};
    resultsWithLocation.forEach((r) => {
      var _a;
      const city = r.location.city;
      if (!cityStats[city]) {
        cityStats[city] = { total: 0, sum: 0, count: 0 };
      }
      cityStats[city].count++;
      cityStats[city].sum += ((_a = r.score) == null ? void 0 : _a.percent) || 0;
      cityStats[city].total++;
    });
    const topCities = Object.entries(cityStats).map(([name, stat]) => ({ name, avg: Math.round(stat.sum / stat.count), count: stat.count })).sort((a, b) => b.count - a.count).slice(0, 5);
    const categoryCount = {};
    questions.forEach((q) => {
      const cat = q.category || "Di\u011Fer";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    const categories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
    const categoryPerformance = {};
    results.forEach((r) => {
      var _a;
      if ((_a = r.timeTracking) == null ? void 0 : _a.questionTimes) {
        r.timeTracking.questionTimes.forEach((qt) => {
          const cat = qt.category || "Di\u011Fer";
          if (!categoryPerformance[cat]) {
            categoryPerformance[cat] = {
              total: 0,
              correct: 0,
              totalTime: 0,
              count: 0
            };
          }
          categoryPerformance[cat].count++;
          categoryPerformance[cat].totalTime += qt.timeSpent;
          if (qt.correct) categoryPerformance[cat].correct++;
          categoryPerformance[cat].total++;
        });
      }
    });
    const categoryStats = Object.entries(categoryPerformance).map(([name, stats]) => ({
      name,
      successRate: Math.round(stats.correct / stats.total * 100),
      avgTime: Math.round(stats.totalTime / stats.count),
      count: stats.count,
      errorRate: 100 - Math.round(stats.correct / stats.total * 100)
    })).sort((a, b) => b.count - a.count);
    const failedCategories = [...categoryStats].sort((a, b) => b.errorRate - a.errorRate).slice(0, 5);
    const slowestCategories = [...categoryStats].sort((a, b) => b.avgTime - a.avgTime).slice(0, 5);
    const difficultyCount = { easy: 0, medium: 0, hard: 0 };
    const difficultyByCategory = { easy: {}, medium: {}, hard: {} };
    questions.forEach((q) => {
      if (q.difficulty) {
        difficultyCount[q.difficulty]++;
        const category = q.category || "Di\u011Fer";
        if (!difficultyByCategory[q.difficulty][category]) {
          difficultyByCategory[q.difficulty][category] = 0;
        }
        difficultyByCategory[q.difficulty][category]++;
      }
    });
    const storeStats = {};
    results.forEach((r) => {
      var _a, _b;
      const store = ((_a = r.employee) == null ? void 0 : _a.store) || "Bilinmiyor";
      if (!storeStats[store]) storeStats[store] = { total: 0, sum: 0, count: 0 };
      storeStats[store].count++;
      storeStats[store].sum += ((_b = r.score) == null ? void 0 : _b.percent) || 0;
      storeStats[store].total++;
    });
    const stores = Object.entries(storeStats).map(([name, stat]) => ({ name, avg: Math.round(stat.sum / stat.count), count: stat.count })).sort((a, b) => b.avg - a.avg).slice(0, 5);
    const performerStats = {};
    results.forEach((r) => {
      var _a, _b, _c;
      const name = ((_a = r.employee) == null ? void 0 : _a.fullName) || "Bilinmiyor";
      const store = ((_b = r.employee) == null ? void 0 : _b.store) || "";
      const key = name + "|" + store;
      if (!performerStats[key]) performerStats[key] = { name, store, sum: 0, count: 0 };
      performerStats[key].sum += ((_c = r.score) == null ? void 0 : _c.percent) || 0;
      performerStats[key].count++;
    });
    const topPerformers = Object.values(performerStats).map((p) => ({ ...p, avg: Math.round(p.sum / p.count) })).sort((a, b) => b.avg - a.avg).slice(0, 5);
    const recentResults = [...results].sort((a, b) => {
      var _a, _b, _c, _d;
      const aTime = ((_b = (_a = a.submittedAt) == null ? void 0 : _a.toDate) == null ? void 0 : _b.call(_a)) || /* @__PURE__ */ new Date(0);
      const bTime = ((_d = (_c = b.submittedAt) == null ? void 0 : _c.toDate) == null ? void 0 : _d.call(_c)) || /* @__PURE__ */ new Date(0);
      return bTime - aTime;
    }).slice(0, 5);
    const formatTime = (seconds) => {
      if (!seconds) return "0 sn";
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      if (min === 0) return `${sec} sn`;
      return `${min} dk ${sec} sn`;
    };
    return /* @__PURE__ */ React.createElement(Page, { title: "Dashboard", subtitle: "Genel Bak\u0131\u015F ve \u0130statistikler" }, /* @__PURE__ */ React.createElement(DemoBadge, null), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "card p-6 bg-gradient-to-br from-primary-50 to-white border-2 border-primary-100 hover:shadow-lg transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl" }, "\u{1F4DA}")), /* @__PURE__ */ React.createElement("span", { className: "px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full" }, "Soru Havuzu")), /* @__PURE__ */ React.createElement("div", { className: "dashboard-kpi-number text-primary-600 mb-1" }, totalQuestions), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-dark-600" }, activeQuestions, " aktif soru"), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-primary-500 font-semibold" }, "\u25CF\u25CF\u25CF"))), /* @__PURE__ */ React.createElement("div", { className: "card p-6 bg-gradient-to-br from-secondary-50 to-white border-2 border-secondary-100 hover:shadow-lg transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl shadow-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl" }, "\u{1F4CA}")), /* @__PURE__ */ React.createElement("span", { className: "px-3 py-1 bg-secondary-100 text-secondary-700 text-xs font-semibold rounded-full" }, "Quiz Oturumlar\u0131")), /* @__PURE__ */ React.createElement("div", { className: "dashboard-kpi-number text-secondary-600 mb-1" }, totalSessions), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-dark-600" }, completedSessions, " tamamland\u0131"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-0.5" }, [...Array(5)].map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "w-1 bg-secondary-400 rounded-full", style: { height: `${8 + i * 3}px` } }))))), /* @__PURE__ */ React.createElement("div", { className: "card p-6 bg-gradient-to-br from-accent-50 to-white border-2 border-accent-100 hover:shadow-lg transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl shadow-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl" }, "\u23F1\uFE0F")), /* @__PURE__ */ React.createElement("span", { className: "px-3 py-1 bg-accent-100 text-accent-700 text-xs font-semibold rounded-full" }, "Ortalama S\xFCre")), /* @__PURE__ */ React.createElement("div", { className: "dashboard-kpi-number text-accent-600 mb-1" }, formatTime(avgQuizTime)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-dark-600" }, avgQuestionTime, " sn/soru"), /* @__PURE__ */ React.createElement(ClockIcon, { size: 18, strokeWidth: 2, className: "text-accent-400" }))), /* @__PURE__ */ React.createElement("div", { className: "card p-6 bg-gradient-to-br from-green-50 to-white border-2 border-green-100 hover:shadow-lg transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-3xl" }, avgScore >= 70 ? "\u{1F3C6}" : avgScore >= 50 ? "\u2B50" : "\u{1F4C8}")), /* @__PURE__ */ React.createElement("span", { className: "px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full" }, "Ortalama Ba\u015Far\u0131")), /* @__PURE__ */ React.createElement("div", { className: "dashboard-kpi-number mb-1", style: { color: avgScore >= 70 ? "#10b981" : avgScore >= 50 ? "#f59e0b" : "#ef4444" } }, avgScore, "%"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-dark-600" }, totalResults, " test"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 h-2 bg-gray-200 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "h-full rounded-full", style: {
      width: `${avgScore}%`,
      background: avgScore >= 70 ? "#10b981" : avgScore >= 50 ? "#f59e0b" : "#ef4444"
    } })))))), /* @__PURE__ */ React.createElement("div", { className: "grid lg:grid-cols-2 gap-6 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "dashboard-section-title text-dark-900 mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(MapPinIcon, { size: 20, strokeWidth: 2 }), " Lokasyon Da\u011F\u0131l\u0131m\u0131"), /* @__PURE__ */ React.createElement("div", { style: { aspectRatio: "1 / 1", borderRadius: "16px", overflow: "hidden" } }, /* @__PURE__ */ React.createElement(LocationMap, { results }))), topCities.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "dashboard-section-title text-dark-900 mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(MapPinIcon, { size: 20, strokeWidth: 2 }), " \u015Eehirlere G\xF6re Performans"), /* @__PURE__ */ React.createElement("div", { className: "overflow-hidden rounded-lg border border-gray-200" }, /* @__PURE__ */ React.createElement("table", { className: "w-full" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-gray-100" }, /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-semibold text-dark-700 uppercase tracking-wider" }, "#"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-semibold text-dark-700 uppercase tracking-wider" }, "\u015Eehir"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-center text-xs font-semibold text-dark-700 uppercase tracking-wider" }, "Test"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-right text-xs font-semibold text-dark-700 uppercase tracking-wider" }, "Ba\u015Far\u0131"))), /* @__PURE__ */ React.createElement("tbody", null, topCities.map((city, idx) => /* @__PURE__ */ React.createElement("tr", { key: city.name, className: idx % 2 === 0 ? "bg-white" : "bg-gray-50" }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xs" }, idx + 1)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-sm font-semibold text-dark-900" }, city.name), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-sm text-center text-dark-600" }, city.count), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-right" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl font-black", style: { color: city.avg >= 70 ? "#5EC5B6" : city.avg >= 50 ? "#FF6B4A" : "#dc2626" } }, city.avg, "%"))))))))), /* @__PURE__ */ React.createElement("div", { className: "grid lg:grid-cols-2 gap-6 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "dashboard-section-title text-dark-900 mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ChartBarIcon, { size: 20, strokeWidth: 2 }), " Kategori Performans\u0131"), categoryStats.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-center py-8" }, "Hen\xFCz veri yok") : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, categoryStats.slice(0, 5).map((cat) => {
      const percent = cat.successRate;
      return /* @__PURE__ */ React.createElement("div", { key: cat.name }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-sm mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-dark-900" }, cat.name), /* @__PURE__ */ React.createElement("span", { className: "text-dark-600" }, percent, "% \u2022 ", formatTime(cat.avgTime))), /* @__PURE__ */ React.createElement("div", { className: "h-2 bg-gray-200 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "h-full",
          style: {
            width: percent + "%",
            background: percent >= 70 ? "linear-gradient(90deg, #5EC5B6, #3DA89C)" : percent >= 50 ? "linear-gradient(90deg, #FF6B4A, #E84A28)" : "linear-gradient(90deg, #dc2626, #b91c1c)"
          }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-500 mt-1" }, cat.count, " soru \xE7\xF6z\xFCld\xFC"));
    }))), /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "dashboard-section-title text-dark-900 mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ExclamationTriangleIcon, { size: 20, strokeWidth: 2 }), " En \xC7ok Yanl\u0131\u015F Yap\u0131lan Konular"), failedCategories.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-center py-8" }, "Hen\xFCz veri yok") : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, failedCategories.map((cat, idx) => /* @__PURE__ */ React.createElement("div", { key: cat.name, className: "flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200" }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-sm" }, idx + 1), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-dark-900" }, cat.name), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-500" }, cat.count, " soru \u2022 ", formatTime(cat.avgTime), " ortalama")), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-black text-red-600" }, cat.errorRate, "%")))))), /* @__PURE__ */ React.createElement("div", { className: "grid lg:grid-cols-2 gap-6 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "dashboard-section-title text-dark-900 mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ClockIcon, { size: 20, strokeWidth: 2 }), " En \xC7ok S\xFCre Harcanan Konular"), slowestCategories.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-center py-8" }, "Hen\xFCz veri yok") : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, slowestCategories.map((cat, idx) => /* @__PURE__ */ React.createElement("div", { key: cat.name, className: "flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200" }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold text-sm" }, idx + 1), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-dark-900" }, cat.name), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-500" }, cat.count, " soru \u2022 ", cat.successRate, "% ba\u015Far\u0131")), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-black text-orange-600" }, cat.avgTime, " sn"))))), /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "dashboard-section-title text-dark-900 mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(RocketLaunchIcon, { size: 20, strokeWidth: 2 }), " Zorluk Da\u011F\u0131l\u0131m\u0131"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-xl bg-accent-50 border-2 border-accent-200 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-4xl font-black text-accent-600" }, difficultyCount.easy), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-dark-600 mt-1" }, "Kolay Sorular")), /* @__PURE__ */ React.createElement("div", { className: "text-5xl" }, "\u{1F60A}")), Object.keys(difficultyByCategory.easy).length > 0 && /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t border-accent-300" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-semibold text-dark-500 mb-2" }, "Kategoriler:"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, Object.entries(difficultyByCategory.easy).map(([cat, count]) => /* @__PURE__ */ React.createElement("span", { key: cat, className: "px-2 py-1 text-xs bg-white rounded-lg border border-accent-300 text-dark-700" }, cat, ": ", /* @__PURE__ */ React.createElement("strong", null, count))))))), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl bg-primary-50 border-2 border-primary-200 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-4xl font-black text-primary-600" }, difficultyCount.medium), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-dark-600 mt-1" }, "Orta Sorular")), /* @__PURE__ */ React.createElement("div", { className: "text-5xl" }, "\u{1F914}")), Object.keys(difficultyByCategory.medium).length > 0 && /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t border-primary-300" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-semibold text-dark-500 mb-2" }, "Kategoriler:"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, Object.entries(difficultyByCategory.medium).map(([cat, count]) => /* @__PURE__ */ React.createElement("span", { key: cat, className: "px-2 py-1 text-xs bg-white rounded-lg border border-primary-300 text-dark-700" }, cat, ": ", /* @__PURE__ */ React.createElement("strong", null, count))))))), /* @__PURE__ */ React.createElement("div", { className: "rounded-xl bg-red-50 border-2 border-red-200 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-4xl font-black text-red-600" }, difficultyCount.hard), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-dark-600 mt-1" }, "Zor Sorular")), /* @__PURE__ */ React.createElement("div", { className: "text-5xl" }, "\u{1F525}")), Object.keys(difficultyByCategory.hard).length > 0 && /* @__PURE__ */ React.createElement("div", { className: "pt-3 border-t border-red-300" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-semibold text-dark-500 mb-2" }, "Kategoriler:"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, Object.entries(difficultyByCategory.hard).map(([cat, count]) => /* @__PURE__ */ React.createElement("span", { key: cat, className: "px-2 py-1 text-xs bg-white rounded-lg border border-red-300 text-dark-700" }, cat, ": ", /* @__PURE__ */ React.createElement("strong", null, count)))))))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-4 border-t border-gray-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "text-dark-600" }, "Toplam Soru"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-dark-900" }, totalQuestions))))), /* @__PURE__ */ React.createElement("div", { className: "grid lg:grid-cols-2 gap-6 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "dashboard-section-title text-dark-900 mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(HomeIcon, { size: 20, strokeWidth: 2 }), " En Ba\u015Far\u0131l\u0131 Ma\u011Fazalar"), stores.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-center py-8" }, "Hen\xFCz veri yok") : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, stores.map((store, idx) => /* @__PURE__ */ React.createElement("div", { key: store.name, className: "flex items-center gap-3 p-3 rounded-lg bg-gray-50" }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold" }, idx + 1), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-dark-900" }, store.name), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-500" }, store.count, " test")), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-black", style: { color: store.avg >= 70 ? "#5EC5B6" : store.avg >= 50 ? "#FF6B4A" : "#dc2626" } }, store.avg, "%"))))), /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "dashboard-section-title text-dark-900 mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(SparklesIcon, { size: 20, strokeWidth: 2 }), " En Ba\u015Far\u0131l\u0131 Personeller"), topPerformers.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-center py-8" }, "Hen\xFCz veri yok") : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, topPerformers.map((p, idx) => /* @__PURE__ */ React.createElement("div", { key: p.name + p.store, className: "flex items-center gap-3 p-3 rounded-lg bg-gray-50" }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 rounded-full bg-gradient-to-br from-secondary-500 to-accent-500 flex items-center justify-center text-white font-bold" }, idx + 1), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-dark-900" }, p.name), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-500" }, p.store, " \u2022 ", p.count, " test")), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-black", style: { color: p.avg >= 70 ? "#5EC5B6" : p.avg >= 50 ? "#FF6B4A" : "#dc2626" } }, p.avg, "%")))))), /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "dashboard-section-title text-dark-900 mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ClockIcon, { size: 20, strokeWidth: 2 }), " Son Aktiviteler"), recentResults.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-center py-8" }, "Hen\xFCz aktivite yok") : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, recentResults.map((r) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
      return /* @__PURE__ */ React.createElement("div", { key: r.id, className: "flex items-center gap-4 p-3 rounded-lg bg-gray-50" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl" }, ((_b = (_a = r.employee) == null ? void 0 : _a.fullName) == null ? void 0 : _b.charAt(0)) || "?"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-dark-900" }, ((_c = r.employee) == null ? void 0 : _c.fullName) || "Personel"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-500" }, ((_d = r.employee) == null ? void 0 : _d.store) || "-", ((_e = r.location) == null ? void 0 : _e.city) && /* @__PURE__ */ React.createElement("span", { className: "ml-2 inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(MapPinIcon, { size: 14, strokeWidth: 2 }), " ", r.location.city), " \u2022 ", " ", fmtDate(r.submittedAt), ((_f = r.timeTracking) == null ? void 0 : _f.totalTime) && /* @__PURE__ */ React.createElement("span", { className: "ml-2 inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(ClockIcon, { size: 14, strokeWidth: 2 }), " ", formatTime(r.timeTracking.totalTime)))), /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-black", style: { color: (((_g = r.score) == null ? void 0 : _g.percent) || 0) >= 70 ? "#5EC5B6" : (((_h = r.score) == null ? void 0 : _h.percent) || 0) >= 50 ? "#FF6B4A" : "#dc2626" } }, ((_i = r.score) == null ? void 0 : _i.percent) || 0, "%"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-500" }, (_j = r.score) == null ? void 0 : _j.correct, "/", (_k = r.score) == null ? void 0 : _k.total)));
    }))));
  };
  window.Dashboard = Dashboard;
})();
