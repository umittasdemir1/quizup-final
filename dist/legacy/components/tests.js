(() => {
  const { useState, useEffect } = React;
  const Tests = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      let unsub;
      const loadResults = () => {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          setLoading(false);
          return;
        }
        const companyId = (() => {
          if (currentUser.isSuperAdmin) {
            try {
              const sel = JSON.parse(localStorage.getItem("superadmin:selectedCompanyData") || "null");
              if ((sel == null ? void 0 : sel.id) && sel.id !== "all") return sel.id;
              return null;
            } catch {
              return null;
            }
          }
          return currentUser.companyId || null;
        })();
        if (!companyId && !currentUser.isSuperAdmin) {
          setResults([]);
          setLoading(false);
          return;
        }
        unsub = window.db.onResultsSnapshot(companyId, (data) => {
          setResults(data);
          setLoading(false);
        });
      };
      loadResults();
      const handleCompanyChange = () => {
        if (unsub) unsub();
        setLoading(true);
        loadResults();
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => {
        if (unsub) unsub();
        window.removeEventListener("company-changed", handleCompanyChange);
      };
    }, []);
    const handleDelete = async (id, sessionId) => {
      if (!confirm("Bu test sonucunu silmek istedi\u011Finizden emin misiniz?")) return;
      try {
        await window.db.deleteResult(id);
        toast("Test sonucu silindi", "success");
      } catch (e) {
        window.devError("Delete result error:", e);
        toast("Sonu\xE7 silinirken hata olu\u015Ftu: " + e.message, "error");
      }
    };
    if (loading) return /* @__PURE__ */ React.createElement(Page, { title: "Test Sonu\xE7lar\u0131" }, /* @__PURE__ */ React.createElement(LoadingSpinner, { text: "Sonu\xE7lar y\xFCkleniyor..." }));
    return /* @__PURE__ */ React.createElement(Page, { title: "Test Sonu\xE7lar\u0131", subtitle: `Toplam ${results.length} sonu\xE7` }, /* @__PURE__ */ React.createElement("div", { className: "grid gap-4" }, results.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "card p-12 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-6xl mb-4" }, /* @__PURE__ */ React.createElement(DocumentTextIcon, { size: 64, strokeWidth: 1.5 })), /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-lg" }, "Hen\xFCz tamamlanan test yok")) : results.map((r) => {
      var _a, _b, _c, _d, _e;
      const percent = ((_a = r.score) == null ? void 0 : _a.percent) || 0;
      const colorClass = percent >= 70 ? "text-accent-600" : percent >= 50 ? "text-primary-500" : "text-red-600";
      const isAbandoned = r.status === "abandoned";
      return /* @__PURE__ */ React.createElement("div", { key: r.id, className: "card p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col lg:flex-row justify-between items-start gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0 w-full" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-lg text-dark-900 break-words" }, ((_b = r.employee) == null ? void 0 : _b.fullName) || "Personel"), isAbandoned && /* @__PURE__ */ React.createElement("span", { className: "chip bg-yellow-100 text-yellow-700 text-xs" }, "\u26A0\uFE0F Terk Edildi")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-600 mb-2 break-words" }, ((_c = r.employee) == null ? void 0 : _c.store) || "-"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-2xl font-bold text-dark-900" }, ((_d = r.score) == null ? void 0 : _d.correct) || 0), /* @__PURE__ */ React.createElement("span", { className: "text-dark-500" }, "/", ((_e = r.score) == null ? void 0 : _e.total) || 0)), /* @__PURE__ */ React.createElement("div", { className: `text-3xl font-black ${colorClass}` }, percent, "%")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dark-400 mt-2" }, fmtDate(r.submittedAt))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 flex-shrink-0" }, /* @__PURE__ */ React.createElement(
        "a",
        {
          href: `#/result?sessionId=${r.sessionId}&resultId=${r.id}`,
          className: "btn btn-primary text-sm px-4 py-2"
        },
        /* @__PURE__ */ React.createElement(ChartBarIcon, { size: 16, strokeWidth: 2, className: "inline" }),
        " Detay"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "btn btn-danger text-sm px-3 py-2",
          onClick: () => handleDelete(r.id, r.sessionId),
          title: "Sil"
        },
        /* @__PURE__ */ React.createElement(TrashIcon, { size: 16, strokeWidth: 2 })
      ))));
    })));
  };
  window.Tests = Tests;
})();
