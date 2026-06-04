(() => {
  const { useState, useEffect, useMemo } = React;
  const lbNormalizeName = (n) => (n || "").trim().toLocaleLowerCase("tr-TR");
  const lbRankBadge = (rank) => {
    if (rank === 1) return "\u{1F947}";
    if (rank === 2) return "\u{1F948}";
    if (rank === 3) return "\u{1F949}";
    return rank;
  };
  const LeaderboardRow = ({ row, highlight, compact }) => /* @__PURE__ */ React.createElement("div", { className: "lb-row" + (highlight ? " lb-row-me" : "") + (row.rank <= 3 ? " lb-row-top" : "") }, /* @__PURE__ */ React.createElement("div", { className: "lb-rank lb-rank-" + (row.rank <= 3 ? row.rank : "n") }, lbRankBadge(row.rank)), /* @__PURE__ */ React.createElement("div", { className: "lb-person" }, /* @__PURE__ */ React.createElement("div", { className: "lb-name" }, row.name, highlight ? /* @__PURE__ */ React.createElement("span", { className: "lb-you" }, "Sen") : null), !compact && /* @__PURE__ */ React.createElement("div", { className: "lb-meta" }, row.examCount, " s\u0131nav \xB7 En iyi %", row.bestPercent)), /* @__PURE__ */ React.createElement("div", { className: "lb-xp" }, /* @__PURE__ */ React.createElement("img", { className: "lb-xp-icon", src: "/assets/xp-icon.png", alt: "", "aria-hidden": "true" }), window.formatXp(row.totalXp)));
  const Leaderboard = ({ sessionId, resultId }) => {
    var _a, _b, _c;
    const isPostQuiz = !!resultId;
    const [loading, setLoading] = useState(true);
    const [allResults, setAllResults] = useState([]);
    const [me, setMe] = useState(null);
    const [range, setRange] = useState("all");
    useEffect(() => {
      let active = true;
      (async () => {
        setLoading(true);
        try {
          let companyId = null;
          if (isPostQuiz) {
            const myResult = await window.db.getResultById(resultId);
            if (active) setMe(myResult || null);
            companyId = (myResult == null ? void 0 : myResult.companyId) || null;
          } else {
            const u = getCurrentUser();
            if (u == null ? void 0 : u.isSuperAdmin) {
              try {
                const sel = JSON.parse(localStorage.getItem("superadmin:selectedCompanyData") || "null");
                companyId = (sel == null ? void 0 : sel.id) && sel.id !== "all" ? sel.id : null;
              } catch {
                companyId = null;
              }
            } else {
              companyId = (u == null ? void 0 : u.companyId) || null;
            }
          }
          const results = await window.db.getResults(companyId ? { companyId } : {});
          if (!active) return;
          setAllResults(results);
        } catch (e) {
          window.devError("Leaderboard load error:", e);
          if (active) toast("Liderlik tablosu y\xFCklenemedi", "error");
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [resultId, isPostQuiz]);
    const rows = useMemo(() => {
      let list = allResults;
      if (!isPostQuiz && range !== "all") {
        const windowMs = range === "daily" ? 24 * 60 * 60 * 1e3 : 7 * 24 * 60 * 60 * 1e3;
        const cutoff = Date.now() - windowMs;
        list = allResults.filter((r) => {
          const t = (r == null ? void 0 : r.submittedAt) ? new Date(r.submittedAt).getTime() : 0;
          return t >= cutoff;
        });
      }
      return window.aggregateLeaderboard(list);
    }, [allResults, range, isPostQuiz]);
    if (loading) {
      return isPostQuiz ? /* @__PURE__ */ React.createElement("div", { className: "lb-screen" }, /* @__PURE__ */ React.createElement(LoadingSpinner, { text: "Liderlik tablosu y\xFCkleniyor..." })) : /* @__PURE__ */ React.createElement(Page, { title: "Liderlik Tablosu" }, /* @__PURE__ */ React.createElement(LoadingSpinner, { text: "Liderlik tablosu y\xFCkleniyor..." }));
    }
    if (!isPostQuiz) {
      const rangeLabels = { daily: "G\xFCnl\xFCk", weekly: "Haftal\u0131k", all: "T\xFCm Zamanlar" };
      const emptyText = range === "daily" ? "Bug\xFCn hen\xFCz sonu\xE7 yok." : range === "weekly" ? "Son 7 g\xFCnde sonu\xE7 yok." : "Hen\xFCz sonu\xE7 yok.";
      return /* @__PURE__ */ React.createElement(Page, { title: "Liderlik Tablosu", subtitle: "\xC7al\u0131\u015Fanlar\u0131n toplam puan s\u0131ralamas\u0131" }, /* @__PURE__ */ React.createElement("div", { className: "lb-tabs", role: "tablist" }, ["daily", "weekly", "all"].map((key) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key,
          type: "button",
          role: "tab",
          "aria-selected": range === key,
          className: "lb-tab" + (range === key ? " active" : ""),
          onClick: () => setRange(key)
        },
        rangeLabels[key]
      ))), rows.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "card p-8 text-center text-dark-500" }, emptyText) : /* @__PURE__ */ React.createElement("div", { className: "lb-list lb-list-admin" }, rows.map((r) => /* @__PURE__ */ React.createElement(LeaderboardRow, { key: r.key, row: r, highlight: false }))));
    }
    const myName = lbNormalizeName((_a = me == null ? void 0 : me.employee) == null ? void 0 : _a.fullName);
    const myIndex = rows.findIndex((r) => r.key === myName);
    const myRow = myIndex >= 0 ? rows[myIndex] : null;
    const earnedXp = Number((_b = me == null ? void 0 : me.score) == null ? void 0 : _b.xp) || 0;
    const topRows = rows.slice(0, 10);
    const showMeSeparately = myRow && myIndex >= 10;
    return /* @__PURE__ */ React.createElement("div", { className: "lb-screen" }, /* @__PURE__ */ React.createElement("div", { className: "lb-card" }, /* @__PURE__ */ React.createElement("div", { className: "lb-hero" }, /* @__PURE__ */ React.createElement("div", { className: "lb-hero-trophy" }, "\u{1F3C6}"), /* @__PURE__ */ React.createElement("div", { className: "lb-hero-title" }, "Tebrikler", ((_c = me == null ? void 0 : me.employee) == null ? void 0 : _c.fullName) ? `, ${me.employee.fullName}` : "", "!"), /* @__PURE__ */ React.createElement("div", { className: "lb-hero-earned" }, /* @__PURE__ */ React.createElement("span", { className: "lb-hero-earned-num" }, /* @__PURE__ */ React.createElement("img", { className: "lb-hero-earned-icon", src: "/assets/xp-icon.png", alt: "", "aria-hidden": "true" }), "+", earnedXp.toLocaleString("tr-TR")), /* @__PURE__ */ React.createElement("span", { className: "lb-hero-earned-label" }, "puan kazand\u0131n")), myRow ? /* @__PURE__ */ React.createElement("div", { className: "lb-standing" }, "S\u0131ralaman: ", /* @__PURE__ */ React.createElement("strong", null, "#", myRow.rank), " / ", rows.length) : null), /* @__PURE__ */ React.createElement("div", { className: "lb-list" }, topRows.map((r) => /* @__PURE__ */ React.createElement(LeaderboardRow, { key: r.key, row: r, highlight: r.key === myName, compact: true })), showMeSeparately ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "lb-gap" }, "\xB7\xB7\xB7"), /* @__PURE__ */ React.createElement(LeaderboardRow, { row: myRow, highlight: true, compact: true })) : null), /* @__PURE__ */ React.createElement("div", { className: "lb-actions" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn btn-primary w-full",
        onClick: () => {
          window.location.hash = `#/result?sessionId=${sessionId || ""}&resultId=${resultId}`;
        }
      },
      "Kullan\u0131c\u0131 Detaylar\u0131 G\xF6r"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn btn-secondary w-full",
        onClick: () => {
          window.location.hash = "#/";
        }
      },
      "Ana Sayfa"
    ))));
  };
  window.Leaderboard = Leaderboard;
})();
