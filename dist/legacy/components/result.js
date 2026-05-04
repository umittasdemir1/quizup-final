(() => {
  const { useState, useEffect } = React;
  const sanitizeBase64 = (input) => (input || "").replace(/\s+/g, "");
  const ensurePdfFont = (pdf) => {
    var _a;
    const base64 = (_a = window.__QUIZUP_PDF_FONTS) == null ? void 0 : _a.dejaVuSans;
    if (!base64) return false;
    const cleaned = sanitizeBase64(base64);
    try {
      if (!window.__QUIZUP_PDF_FONT_REGISTERED) {
        pdf.addFileToVFS("DejaVuSans.ttf", cleaned);
        pdf.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
        pdf.addFont("DejaVuSans.ttf", "DejaVuSans", "bold");
        window.__QUIZUP_PDF_FONT_REGISTERED = true;
      }
      pdf.setFont("DejaVuSans", "normal");
      return true;
    } catch (err) {
      window.devWarn("PDF font y\xFCklenemedi:", err);
      return false;
    }
  };
  const fetchImageAsDataUrl = async (url) => {
    if (!url) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Logo iste\u011Fi ba\u015Far\u0131s\u0131z: ${response.status}`);
      }
      const blob = await response.blob();
      const format = (blob.type || "").toLowerCase().includes("png") ? "PNG" : (blob.type || "").toLowerCase().includes("jpg") || (blob.type || "").toLowerCase().includes("jpeg") ? "JPEG" : "PNG";
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ dataUrl: reader.result, format });
        reader.onerror = () => reject(new Error("Logo dosyas\u0131 okunamad\u0131"));
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      window.devWarn("Logo y\xFCklenemedi:", err);
      return null;
    }
  };
  const generateQRCodeDataUrl = (text, size = 220) => new Promise((resolve, reject) => {
    if (!window.QRCode) {
      reject(new Error("QR kod k\xFCt\xFCphanesi y\xFCklenmedi"));
      return;
    }
    const temp = document.createElement("div");
    temp.style.position = "absolute";
    temp.style.left = "-10000px";
    temp.style.top = "0";
    temp.style.width = `${size}px`;
    temp.style.height = `${size}px`;
    document.body.appendChild(temp);
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      temp.remove();
    };
    try {
      new window.QRCode(temp, {
        text,
        width: size,
        height: size,
        correctLevel: window.QRCode.CorrectLevel.H
      });
    } catch (err) {
      cleanup();
      reject(err);
      return;
    }
    const tryResolve = (attempt = 0) => {
      const canvas = temp.querySelector("canvas");
      const img = temp.querySelector("img");
      if (canvas) {
        try {
          const dataUrl = canvas.toDataURL("image/png");
          cleanup();
          resolve({ dataUrl, format: "PNG" });
          return;
        } catch (err) {
          cleanup();
          reject(err);
          return;
        }
      }
      if (img && img.src) {
        const done = img.complete || attempt > 10;
        if (done) {
          const format = img.src.startsWith("data:image/jpeg") ? "JPEG" : img.src.startsWith("data:image/webp") ? "WEBP" : "PNG";
          cleanup();
          resolve({ dataUrl: img.src, format });
          return;
        }
      }
      if (attempt > 20) {
        cleanup();
        reject(new Error("QR kod olu\u015Fturulamad\u0131"));
        return;
      }
      setTimeout(() => tryResolve(attempt + 1), 50);
    };
    setTimeout(() => tryResolve(), 0);
  });
  const titleCase = (value) => {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  };
  const getDateParts = (inputDate) => {
    const date = inputDate instanceof Date ? inputDate : new Date(inputDate);
    const locale = "tr-TR";
    const day = titleCase(new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date));
    const dateLabel = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }).format(date);
    const timeLabel = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
    return { day, date: dateLabel, time: timeLabel };
  };
  const formatDurationDetailed = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return "0 sn";
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    if (minutes <= 0) return `${secs} sn`;
    return `${minutes} dk ${secs} sn`;
  };
  const computeCategoryStats = (questions, answers, questionTimes) => {
    const stats = {};
    const timeMap = {};
    (questionTimes || []).forEach((qt) => {
      if (qt == null ? void 0 : qt.questionId) {
        timeMap[qt.questionId] = qt;
      }
    });
    questions.forEach((q) => {
      const category = q.category || "Kategorisiz";
      if (!stats[category]) {
        stats[category] = {
          category,
          questionCount: 0,
          correct: 0,
          incorrect: 0,
          timeSpent: 0
        };
      }
      const entry = stats[category];
      entry.questionCount += 1;
      const qTime = timeMap[q.id];
      if (qTime == null ? void 0 : qTime.timeSpent) {
        entry.timeSpent += Number(qTime.timeSpent) || 0;
      }
      let isCorrect = null;
      if (typeof (qTime == null ? void 0 : qTime.correct) === "boolean") {
        isCorrect = qTime.correct;
      } else if (q.type === "mcq") {
        const picked = answers == null ? void 0 : answers[q.id];
        if (picked != null && picked !== "") {
          isCorrect = picked === q.correctAnswer;
        } else if ((qTime == null ? void 0 : qTime.status) === "timeout" || (qTime == null ? void 0 : qTime.status) === "skipped") {
          isCorrect = false;
        }
      }
      if (isCorrect === true) entry.correct += 1;
      if (isCorrect === false) entry.incorrect += 1;
    });
    return Object.values(stats).sort((a, b) => a.category.localeCompare(b.category, "tr"));
  };
  const buildManagerName = (creator) => {
    if (!creator) return null;
    const first = creator.firstName || creator.name || "";
    const last = creator.lastName || creator.surname || "";
    const full = `${first} ${last}`.trim();
    return full || creator.email || null;
  };
  const Result = ({ sessionId, resultId }) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const [data, setData] = useState(null);
    const [session, setSession] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [branding, setBranding] = useState(null);
    const [creator, setCreator] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const resultData = await window.db.getResultById(resultId);
          if (!resultData) {
            if (active) {
              setData(null);
              setSession(null);
              setQuestions([]);
              setBranding(null);
              setCreator(null);
              toast("Sonu\xE7 bulunamad\u0131", "error");
            }
            return;
          }
          if (!active) return;
          setData(resultData);
          const brandingPromise = window.db.getSetting("branding").catch((err) => {
            window.devWarn("Branding y\xFCklenemedi:", err);
            return null;
          });
          let sessionData = null;
          if (resultData.sessionId) {
            try {
              sessionData = await window.db.getSessionById(resultData.sessionId);
            } catch (err) {
              window.devWarn("Oturum y\xFCklenemedi:", err);
            }
          }
          if (!active) return;
          if (sessionData) {
            setSession(sessionData);
            const qs = await window.db.getQuestionsByIds(sessionData.questionIds || []);
            if (!active) return;
            setQuestions(qs.filter(Boolean));
            if (sessionData.createdBy) {
              try {
                const creatorProfile = await window.db.getProfileById(sessionData.createdBy);
                if (active) setCreator(creatorProfile);
              } catch (err) {
                window.devWarn("Yetkili bilgisi al\u0131namad\u0131:", err);
                if (active) setCreator(null);
              }
            } else if (active) {
              setCreator(null);
            }
          } else if (active) {
            setSession(null);
            setQuestions([]);
            setCreator(null);
          }
          const brandingData = await brandingPromise;
          if (active) {
            setBranding(brandingData || null);
          }
        } catch (e) {
          if (active) {
            window.devError("Result load error:", e);
            toast("Sonu\xE7 y\xFCklenirken hata olu\u015Ftu", "error");
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [sessionId, resultId]);
    const downloadPDF = async () => {
      var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h, _i, _j, _k;
      if (!((_a2 = window.jspdf) == null ? void 0 : _a2.jsPDF)) {
        toast("PDF k\xFCt\xFCphanesi y\xFCklenemedi", "error");
        return;
      }
      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("portrait", "mm", "a4");
        const fontReady = ensurePdfFont(pdf);
        if (!fontReady) {
          pdf.setFont("helvetica", "normal");
        }
        const setFontWeight = (weight = "normal") => {
          if (fontReady) {
            pdf.setFont("DejaVuSans", weight);
          } else {
            pdf.setFont("helvetica", weight);
          }
        };
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 20;
        const topY = margin;
        const submittedDate = ((_b2 = data == null ? void 0 : data.submittedAt) == null ? void 0 : _b2.toDate) ? data.submittedAt.toDate() : (data == null ? void 0 : data.submittedAt) ? new Date(data.submittedAt) : /* @__PURE__ */ new Date();
        const dateParts = getDateParts(submittedDate);
        const dateBoxWidth = 58;
        const dateBoxHeight = 32;
        const dateBoxX = pageWidth - margin - dateBoxWidth;
        const dateBoxY = topY;
        pdf.setDrawColor(215, 219, 223);
        pdf.setLineWidth(0.4);
        pdf.roundedRect(dateBoxX, dateBoxY, dateBoxWidth, dateBoxHeight, 3, 3, "S");
        setFontWeight("bold");
        pdf.setFontSize(10);
        pdf.setTextColor(26, 35, 50);
        pdf.text(dateParts.day, dateBoxX + dateBoxWidth / 2, dateBoxY + 11, { align: "center" });
        setFontWeight("normal");
        pdf.setFontSize(9);
        pdf.text(dateParts.date, dateBoxX + dateBoxWidth / 2, dateBoxY + 19, { align: "center" });
        pdf.text(dateParts.time, dateBoxX + dateBoxWidth / 2, dateBoxY + 27, { align: "center" });
        let contentTop = topY;
        if (branding == null ? void 0 : branding.logoUrl) {
          const logoData = await fetchImageAsDataUrl(branding.logoUrl);
          if (logoData == null ? void 0 : logoData.dataUrl) {
            try {
              const props = pdf.getImageProperties(logoData.dataUrl);
              const maxWidth = 70;
              const maxHeight = 28;
              let logoWidth = maxWidth;
              let logoHeight = maxHeight;
              if ((props == null ? void 0 : props.width) && (props == null ? void 0 : props.height)) {
                const aspect = props.width / props.height;
                logoWidth = Math.min(maxWidth, maxHeight * aspect);
                logoHeight = logoWidth / aspect;
                if (logoHeight > maxHeight) {
                  logoHeight = maxHeight;
                  logoWidth = logoHeight * aspect;
                }
              }
              const logoX = (pageWidth - logoWidth) / 2;
              pdf.addImage(logoData.dataUrl, logoData.format || "PNG", logoX, topY, logoWidth, logoHeight);
              contentTop = topY + logoHeight;
            } catch (err) {
              window.devWarn("Logo PDF'e eklenemedi:", err);
            }
          }
        }
        contentTop = Math.max(contentTop, topY + 28);
        const marginLeft = margin;
        let currentY = contentTop + 14;
        const employeeName = ((_c2 = data == null ? void 0 : data.employee) == null ? void 0 : _c2.fullName) || ((_d2 = session == null ? void 0 : session.employee) == null ? void 0 : _d2.fullName) || "-";
        const storeName = ((_e2 = session == null ? void 0 : session.employee) == null ? void 0 : _e2.store) || ((_f2 = data == null ? void 0 : data.employee) == null ? void 0 : _f2.store) || "";
        setFontWeight("bold");
        pdf.setFontSize(12);
        pdf.setTextColor(26, 35, 50);
        pdf.text(`Say\u0131n ${employeeName || "-"},`, marginLeft, currentY);
        currentY += 7;
        setFontWeight("normal");
        pdf.setFontSize(10);
        if (storeName) {
          pdf.text(`Ma\u011Faza: ${storeName}`, marginLeft, currentY);
          currentY += 6;
        }
        pdf.text("S\u0131nav performans \xF6zetiniz a\u015Fa\u011F\u0131da sunulmu\u015Ftur.", marginLeft, currentY);
        currentY += 10;
        let qrBottom = currentY;
        const qrLink = `${location.origin}${location.pathname}#/tests?focus=${resultId}`;
        let qrData = null;
        try {
          qrData = await generateQRCodeDataUrl(qrLink, 260);
        } catch (err) {
          window.devWarn("QR kod olu\u015Fturulamad\u0131:", err);
        }
        const qrSize = 42;
        if (qrData == null ? void 0 : qrData.dataUrl) {
          pdf.addImage(qrData.dataUrl, qrData.format || "PNG", marginLeft, currentY, qrSize, qrSize);
          pdf.setFontSize(8);
          pdf.setTextColor(107, 114, 128);
          pdf.text("Tarayarak test sonu\xE7lar\u0131n\u0131 g\xF6r\xFCnt\xFCleyin", marginLeft + qrSize / 2, currentY + qrSize + 4, { align: "center" });
          qrBottom = currentY + qrSize + 10;
        }
        const categoryStats = computeCategoryStats(questions, data == null ? void 0 : data.answers, questionTimes);
        const tableX = (qrData == null ? void 0 : qrData.dataUrl) ? marginLeft + qrSize + 12 : marginLeft;
        const tableTop = currentY;
        const tableWidth = pageWidth - tableX - margin;
        const headerHeight = 9;
        const rowHeight = 8;
        const columns = [
          { key: "category", label: "Kategori", width: tableWidth * 0.38, align: "left" },
          { key: "questionCount", label: "Soru", width: tableWidth * 0.14, align: "center" },
          { key: "correct", label: "Do\u011Fru", width: tableWidth * 0.16, align: "center" },
          { key: "incorrect", label: "Yanl\u0131\u015F", width: tableWidth * 0.16, align: "center" },
          { key: "timeSpent", label: "S\xFCre", width: tableWidth * 0.16, align: "center" }
        ];
        pdf.setDrawColor(217, 221, 228);
        pdf.setFillColor(245, 248, 252);
        pdf.rect(tableX, tableTop, tableWidth, headerHeight, "FD");
        setFontWeight("bold");
        pdf.setFontSize(9);
        pdf.setTextColor(96, 104, 118);
        let headerX = tableX;
        columns.forEach((col) => {
          const align = col.align === "center" ? "center" : col.align === "right" ? "right" : "left";
          const textX = col.align === "center" ? headerX + col.width / 2 : col.align === "right" ? headerX + col.width - 2 : headerX + 2;
          pdf.text(col.label, textX, tableTop + 6, { align });
          headerX += col.width;
        });
        let tableY = tableTop + headerHeight;
        setFontWeight("normal");
        pdf.setTextColor(26, 35, 50);
        if (categoryStats.length === 0) {
          pdf.setFontSize(9);
          pdf.text("Kategori verisi bulunamad\u0131", tableX + tableWidth / 2, tableY + 6, { align: "center" });
          tableY += rowHeight;
        } else {
          categoryStats.forEach((row) => {
            pdf.setDrawColor(230, 234, 240);
            pdf.rect(tableX, tableY, tableWidth, rowHeight, "S");
            let cellX = tableX;
            columns.forEach((col) => {
              let value = row[col.key];
              if (col.key === "timeSpent") {
                value = formatDurationDetailed(row.timeSpent);
              }
              if (col.key === "category") {
                value = value || "Di\u011Fer";
              }
              const align = col.align === "center" ? "center" : col.align === "right" ? "right" : "left";
              const textX = col.align === "center" ? cellX + col.width / 2 : col.align === "right" ? cellX + col.width - 2 : cellX + 2;
              pdf.setFontSize(9);
              pdf.text(String(value != null ? value : "-"), textX, tableY + 5.5, { align });
              cellX += col.width;
            });
            tableY += rowHeight;
          });
        }
        const sectionBottom = Math.max(qrBottom, tableY);
        const summaryTop = sectionBottom + 8;
        const summaryWidth = pageWidth - margin * 2;
        const summaryHeight = 30;
        pdf.setDrawColor(217, 221, 228);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(margin, summaryTop, summaryWidth, summaryHeight, 3, 3, "S");
        const totalCorrect = ((_g2 = data == null ? void 0 : data.score) == null ? void 0 : _g2.correct) || 0;
        const totalQuestions = ((_h = data == null ? void 0 : data.score) == null ? void 0 : _h.total) || questions.length || 0;
        const totalWrong = Math.max(0, totalQuestions - totalCorrect);
        const percent2 = (_j = (_i = data == null ? void 0 : data.score) == null ? void 0 : _i.percent) != null ? _j : totalQuestions ? Math.round(totalCorrect / totalQuestions * 100) : 0;
        const totalTime = ((_k = data == null ? void 0 : data.timeTracking) == null ? void 0 : _k.totalTime) || 0;
        const summaryItems = [
          { label: "Toplam Soru", value: totalQuestions },
          { label: "Do\u011Fru", value: totalCorrect },
          { label: "Yanl\u0131\u015F", value: totalWrong },
          { label: "Ba\u015Far\u0131", value: `${percent2}%` },
          { label: "Toplam S\xFCre", value: formatDurationDetailed(totalTime) }
        ];
        const itemWidth = summaryWidth / summaryItems.length;
        summaryItems.forEach((item, idx) => {
          const centerX = margin + itemWidth * idx + itemWidth / 2;
          setFontWeight("normal");
          pdf.setFontSize(8.5);
          pdf.setTextColor(107, 114, 128);
          pdf.text(item.label, centerX, summaryTop + 9, { align: "center" });
          setFontWeight("bold");
          pdf.setFontSize(12);
          pdf.setTextColor(26, 35, 50);
          pdf.text(String(item.value), centerX, summaryTop + 19, { align: "center" });
        });
        const managerTop = summaryTop + summaryHeight + 12;
        const managerName = buildManagerName(creator);
        setFontWeight("bold");
        pdf.setFontSize(10);
        pdf.setTextColor(26, 35, 50);
        pdf.text(`S\u0131nav\u0131 Uygulayan Yetkili: ${managerName || "Belirtilmedi"}`, margin, managerTop);
        setFontWeight("normal");
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Rapor olu\u015Fturulma tarihi: ${dateParts.date} ${dateParts.time}`, margin, managerTop + 6);
        pdf.save("quizup_sonuc.pdf");
        toast("PDF indirildi", "success");
      } catch (e) {
        window.devError("PDF error:", e);
        toast("PDF olu\u015Fturulurken hata olu\u015Ftu", "error");
      }
    };
    const formatTime = (seconds) => {
      if (!seconds) return "0 sn";
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      if (min === 0) return `${sec} sn`;
      return `${min} dk ${sec} sn`;
    };
    if (loading) return /* @__PURE__ */ React.createElement(Page, { title: "Sonu\xE7" }, /* @__PURE__ */ React.createElement(LoadingSpinner, { text: "Sonu\xE7 y\xFCkleniyor..." }));
    if (!data) return /* @__PURE__ */ React.createElement(Page, { title: "Sonu\xE7" }, /* @__PURE__ */ React.createElement("div", { className: "card p-6 text-red-600" }, "Sonu\xE7 bulunamad\u0131."));
    const correct = ((_a = data.score) == null ? void 0 : _a.correct) || 0;
    const total = ((_b = data.score) == null ? void 0 : _b.total) || 0;
    const percent = ((_c = data.score) == null ? void 0 : _c.percent) || 0;
    const circ = 534;
    const off = circ - circ * correct / Math.max(1, total);
    const timeTracking = data.timeTracking || {};
    const questionTimes = timeTracking.questionTimes || [];
    const sortedByTime = [...questionTimes].sort((a, b) => b.timeSpent - a.timeSpent);
    const fastestQ = sortedByTime[sortedByTime.length - 1];
    const slowestQ = sortedByTime[0];
    const timeoutCount = questionTimes.filter((qt) => qt.status === "timeout").length;
    const skippedCount = questionTimes.filter((qt) => qt.status === "skipped").length;
    const totalTimeouts = typeof ((_d = data.score) == null ? void 0 : _d.timeouts) === "number" ? data.score.timeouts : timeoutCount;
    const totalSkipped = typeof ((_e = data.score) == null ? void 0 : _e.skipped) === "number" ? data.score.skipped : skippedCount;
    return /* @__PURE__ */ React.createElement(
      Page,
      {
        title: "Sonu\xE7",
        subtitle: (((_f = session == null ? void 0 : session.employee) == null ? void 0 : _f.fullName) || "Personel") + " \u2022 " + (((_g = session == null ? void 0 : session.employee) == null ? void 0 : _g.store) || ""),
        extra: /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary flex items-center gap-2", onClick: downloadPDF }, /* @__PURE__ */ React.createElement(ArrowDownTrayIcon, { size: 18, strokeWidth: 2 }), " PDF \u0130ndir")
      },
      /* @__PURE__ */ React.createElement("div", { className: "grid lg:grid-cols-3 gap-6 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "card p-8 flex flex-col items-center justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "relative w-full max-w-[240px] aspect-square" }, /* @__PURE__ */ React.createElement("svg", { className: "w-full h-full", viewBox: "0 0 200 200" }, /* @__PURE__ */ React.createElement("circle", { cx: "100", cy: "100", r: "85", fill: "none", stroke: "#e5e7eb", strokeWidth: "12" }), /* @__PURE__ */ React.createElement(
        "circle",
        {
          cx: "100",
          cy: "100",
          r: "85",
          fill: "none",
          stroke: percent >= 70 ? "#5EC5B6" : percent >= 50 ? "#FF6B4A" : "#dc2626",
          strokeWidth: "12",
          strokeDasharray: "534",
          strokeDashoffset: String(off),
          transform: "rotate(-90 100 100)",
          strokeLinecap: "round"
        }
      ), /* @__PURE__ */ React.createElement("text", { x: "100", y: "110", textAnchor: "middle", fontSize: "64", fontWeight: "bold", fill: "#1A2332" }, correct, /* @__PURE__ */ React.createElement("tspan", { fontSize: "28", fill: "#6b7280" }, "/", total)))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-4xl font-black", style: { color: percent >= 70 ? "#5EC5B6" : percent >= 50 ? "#FF6B4A" : "#dc2626" } }, percent, "%"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-dark-500 mt-1" }, "Ba\u015Far\u0131 Oran\u0131"))), /* @__PURE__ */ React.createElement("div", { className: "card p-4 sm:p-6 lg:col-span-2" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base sm:text-lg font-bold text-dark-900 mb-3 sm:mb-4" }, "\u23F1\uFE0F S\xFCre \u0130statistikleri"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-primary-50 p-3 sm:p-4 rounded-xl border border-primary-200 flex flex-col justify-center min-h-[80px]" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs sm:text-sm text-dark-600 mb-1 sm:mb-2" }, "Toplam S\xFCre"), /* @__PURE__ */ React.createElement("div", { className: "text-lg sm:text-xl md:text-2xl font-bold text-primary-600" }, formatTime(timeTracking.totalTime))), /* @__PURE__ */ React.createElement("div", { className: "bg-secondary-50 p-3 sm:p-4 rounded-xl border border-secondary-200 flex flex-col justify-center min-h-[80px]" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs sm:text-sm text-dark-600 mb-1 sm:mb-2" }, "Ortalama Soru S\xFCresi"), /* @__PURE__ */ React.createElement("div", { className: "text-lg sm:text-xl md:text-2xl font-bold text-secondary-600" }, timeTracking.averageTimePerQuestion || 0, " sn")), fastestQ && /* @__PURE__ */ React.createElement("div", { className: "bg-accent-50 p-3 sm:p-4 rounded-xl border border-accent-200 flex flex-col justify-center min-h-[80px]" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs sm:text-sm text-dark-600 mb-1 sm:mb-2 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(BoltIcon, { size: 16, strokeWidth: 2 }), " En H\u0131zl\u0131"), /* @__PURE__ */ React.createElement("div", { className: "text-base sm:text-lg md:text-xl font-bold text-accent-600" }, fastestQ.timeSpent, " sn"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-500 mt-1 truncate" }, fastestQ.category)), slowestQ && /* @__PURE__ */ React.createElement("div", { className: "bg-orange-50 p-3 sm:p-4 rounded-xl border border-orange-200 flex flex-col justify-center min-h-[80px]" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs sm:text-sm text-dark-600 mb-1 sm:mb-2 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(ClockIcon, { size: 16, strokeWidth: 2 }), " En Yava\u015F"), /* @__PURE__ */ React.createElement("div", { className: "text-base sm:text-lg md:text-xl font-bold text-orange-600" }, slowestQ.timeSpent, " sn"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-500 mt-1 truncate" }, slowestQ.category))), (totalTimeouts > 0 || totalSkipped > 0) && /* @__PURE__ */ React.createElement("div", { className: "mt-4 space-y-2" }, totalTimeouts > 0 && /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-red-50 rounded-lg border border-red-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-red-700" }, /* @__PURE__ */ React.createElement("span", { className: "text-xl" }, "\u23F0"), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold" }, totalTimeouts, " soruda s\xFCre doldu"))), totalSkipped > 0 && /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-gray-100 rounded-lg border border-gray-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-gray-700" }, /* @__PURE__ */ React.createElement("span", { className: "text-xl" }, "\u2B55"), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold" }, totalSkipped, " soru bo\u015F b\u0131rak\u0131ld\u0131")))))),
      /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-dark-500 mb-4" }, "Cevaplar\u0131n\u0131z"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 max-h-[600px] overflow-y-auto pr-2" }, questions.map((q, i) => {
        var _a2;
        const picked = (_a2 = data.answers) == null ? void 0 : _a2[q.id];
        const ok = q.type === "mcq" ? picked === q.correctAnswer : null;
        const qTime = questionTimes.find((qt) => qt.questionId === q.id);
        const status = qTime == null ? void 0 : qTime.status;
        const getLeadingIcon = () => {
          if (status === "timeout") {
            return /* @__PURE__ */ React.createElement(ClockIcon, { size: 28, strokeWidth: 1.5, className: "text-orange-600" });
          } else if (status === "skipped") {
            return /* @__PURE__ */ React.createElement(MinusCircleIcon, { size: 28, strokeWidth: 1.5, className: "text-gray-500" });
          } else if (ok === true) {
            return /* @__PURE__ */ React.createElement(CheckIcon, { size: 28, strokeWidth: 2, className: "text-accent-600" });
          } else if (ok === false) {
            return /* @__PURE__ */ React.createElement(XMarkIcon, { size: 28, strokeWidth: 2, className: "text-red-600" });
          } else {
            return /* @__PURE__ */ React.createElement(DocumentTextIcon, { size: 28, strokeWidth: 1.5, className: "text-secondary-500" });
          }
        };
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: q.id,
            className: "p-4 rounded-xl border-2 " + (ok === true ? "border-accent-400 bg-accent-50" : ok === false ? "border-red-300 bg-red-50" : "border-secondary-200 bg-secondary-50")
          },
          /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0" }, getLeadingIcon()), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-dark-900 mb-2" }, i + 1, ". ", q.questionText), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-700" }, /* @__PURE__ */ React.createElement("b", null, "Cevab\u0131n\u0131z:"), " ", picked == null ? "-" : String(picked)), q.type === "mcq" && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-700 mt-1" }, /* @__PURE__ */ React.createElement("b", null, "Do\u011Fru Cevap:"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-accent-600 font-semibold" }, q.correctAnswer)), qTime && /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 mt-2 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue" }, "\u23F1\uFE0F ", qTime.timeSpent, " sn"), status === "timeout" && /* @__PURE__ */ React.createElement("span", { className: "chip bg-red-100 text-red-700" }, "\u23F0 S\xFCre Doldu"), status === "skipped" && /* @__PURE__ */ React.createElement("span", { className: "chip bg-gray-200 text-gray-700" }, "\u2B55 Bo\u015F B\u0131rak\u0131ld\u0131"))))
        );
      })), /* @__PURE__ */ React.createElement("div", { className: "mt-6 flex justify-end gap-3" }, /* @__PURE__ */ React.createElement("a", { className: "btn btn-secondary flex items-center gap-2", href: "#/tests" }, /* @__PURE__ */ React.createElement(ChartBarIcon, { size: 18, strokeWidth: 2 }), " T\xFCm Sonu\xE7lar"), /* @__PURE__ */ React.createElement("a", { className: "btn btn-primary flex items-center gap-2", href: "#/manager" }, /* @__PURE__ */ React.createElement(PlusCircleIcon, { size: 18, strokeWidth: 2 }), " Yeni Quiz")))
    );
  };
  window.Result = Result;
})();
