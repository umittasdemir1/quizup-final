(() => {
  const { useState, useEffect } = React;
  const MyTests = () => {
    const [myTests, setMyTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const getAnonymousId = () => {
      let anonId = localStorage.getItem("anonUserId");
      if (!anonId) {
        anonId = "anon_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("anonUserId", anonId);
      }
      return anonId;
    };
    useEffect(() => {
      loadMyTests();
    }, []);
    const loadMyTests = async () => {
      try {
        const anonId = getAnonymousId();
        const myTestIds = JSON.parse(localStorage.getItem(`tests_${anonId}`) || "[]");
        if (myTestIds.length === 0) {
          setLoading(false);
          return;
        }
        const staleIds = /* @__PURE__ */ new Set();
        const tests = [];
        for (const testId of myTestIds) {
          try {
            const result = await window.db.getResultById(testId);
            if (result) {
              tests.push(result);
            } else {
              staleIds.add(testId);
            }
          } catch (e) {
            const message = (e == null ? void 0 : e.message) || "";
            if (message.toLowerCase().includes("permission")) {
              staleIds.add(testId);
              window.devWarn("Eri\u015Fim izni olmayan test kayd\u0131 kald\u0131r\u0131l\u0131yor:", testId);
            } else {
              window.devError("Test y\xFCklenirken hata:", testId, e);
            }
          }
        }
        if (staleIds.size > 0) {
          const filteredIds = myTestIds.filter((id) => !staleIds.has(id));
          localStorage.setItem(`tests_${anonId}`, JSON.stringify(filteredIds));
          if (staleIds.size === myTestIds.length) {
            toast("Eski test kay\u0131tlar\u0131na eri\u015Filemiyor. L\xFCtfen yeni bir quiz ba\u015Flat\u0131n.", "warning");
          } else {
            toast("Baz\u0131 eski test kay\u0131tlar\u0131na eri\u015Filemiyor ve listeden kald\u0131r\u0131ld\u0131.", "info");
          }
        }
        setMyTests(tests.sort((a, b) => {
          const aTime = new Date(a.submittedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.submittedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        }));
      } catch (e) {
        window.devError("Load my tests error:", e);
        toast("Testleriniz y\xFCklenemedi", "error");
      } finally {
        setLoading(false);
      }
    };
    if (loading) return /* @__PURE__ */ React.createElement(Page, { title: "Testlerim" }, /* @__PURE__ */ React.createElement(LoadingSpinner, null));
    return /* @__PURE__ */ React.createElement(Page, { title: "Testlerim", subtitle: `${myTests.length} test tamamland\u0131` }, myTests.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "card p-12 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-6xl mb-4" }, /* @__PURE__ */ React.createElement(DocumentTextIcon, { size: 64, strokeWidth: 1.5, className: "inline text-primary-500" })), /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-lg mb-4" }, "Hen\xFCz test tamamlamad\u0131n\u0131z"), /* @__PURE__ */ React.createElement("a", { href: "#/", className: "btn btn-primary" }, "Quiz'e Ba\u015Fla")) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4" }, myTests.map((test) => {
      var _a, _b, _c, _d;
      const percent = ((_a = test.score) == null ? void 0 : _a.percent) || 0;
      const correct = ((_b = test.score) == null ? void 0 : _b.correct) || 0;
      const total = ((_c = test.score) == null ? void 0 : _c.total) || 0;
      return /* @__PURE__ */ React.createElement("div", { key: test.id, className: "card p-6 hover:shadow-lg transition-shadow" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-2" }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "text-3xl font-black",
          style: {
            color: percent >= 70 ? "#5EC5B6" : percent >= 50 ? "#FF6B4A" : "#dc2626"
          }
        },
        percent,
        "%"
      ), /* @__PURE__ */ React.createElement("div", { className: "text-dark-600" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold" }, correct, "/", total, " Do\u011Fru"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-dark-500" }, fmtDate(test.submittedAt)))), test.employee && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-dark-600" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, test.employee.fullName), test.employee.store && /* @__PURE__ */ React.createElement("span", null, " \u2022 ", test.employee.store)), test.timeTracking && /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 mt-2 text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue" }, /* @__PURE__ */ React.createElement(ClockIcon, { size: 14, strokeWidth: 2, className: "inline" }), " ", Math.floor(test.timeTracking.totalTime / 60), "dk ", test.timeTracking.totalTime % 60, "sn"), /* @__PURE__ */ React.createElement("span", { className: "chip bg-gray-100 text-gray-700" }, ((_d = test.score) == null ? void 0 : _d.total) || 0, " soru"))), /* @__PURE__ */ React.createElement(
        "a",
        {
          href: `#/result?sessionId=${test.sessionId}&resultId=${test.id}`,
          className: "btn btn-sm bg-blue-500 text-white hover:bg-blue-600"
        },
        /* @__PURE__ */ React.createElement(ChartBarIcon, { size: 16, strokeWidth: 2, className: "inline mr-1" }),
        " Detay"
      )));
    })), /* @__PURE__ */ React.createElement("div", { className: "mt-6 text-center" }, /* @__PURE__ */ React.createElement("a", { href: "#/", className: "btn btn-primary" }, "\u{1F195} Yeni Quiz Ba\u015Flat")));
  };
  window.MyTests = MyTests;
})();
