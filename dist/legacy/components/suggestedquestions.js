(() => {
  const { useState, useEffect, useRef } = React;
  const SuggestedQuestions = () => {
    var _a, _b, _c, _d;
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [editErrors, setEditErrors] = useState({});
    const questionImageRef = useRef(null);
    const optionImageRefs = useRef([]);
    const getDbCompanyId = () => {
      const currentUser = getCurrentUser();
      if (!currentUser) return null;
      if (currentUser.isSuperAdmin) {
        try {
          const selected = JSON.parse(localStorage.getItem("superadmin:selectedCompanyData") || "null");
          if ((selected == null ? void 0 : selected.id) && selected.id !== "all") return selected.id;
          return null;
        } catch {
          return null;
        }
      }
      return currentUser.companyId || null;
    };
    useEffect(() => {
      if (!requireAuth("admin")) return;
    }, []);
    useEffect(() => {
      loadSuggestions();
      const handleCompanyChange = () => {
        setLoading(true);
        loadSuggestions();
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => window.removeEventListener("company-changed", handleCompanyChange);
    }, []);
    const loadSuggestions = async () => {
      window.devLog("=== LOADING SUGGESTIONS ===");
      try {
        const currentUser = getCurrentUser();
        const companyId = getDbCompanyId();
        if (!companyId && !(currentUser == null ? void 0 : currentUser.isSuperAdmin)) {
          setSuggestions([]);
          setLoading(false);
          return;
        }
        const data = await window.db.getSuggestedQuestions(companyId);
        window.devLog("Total suggestions loaded:", data.length);
        setSuggestions(data);
      } catch (e) {
        window.devError("Load suggestions error:", e);
        window.devError("Error details:", e.message, e.code);
        toast("\xD6neriler y\xFCklenemedi: " + e.message, "error");
      } finally {
        setLoading(false);
      }
    };
    const updateEditField = (key, value) => {
      setEditForm((prev) => ({ ...prev, [key]: value }));
      if (editErrors[key]) {
        setEditErrors((prev) => ({ ...prev, [key]: null }));
      }
    };
    const updateEditOption = (index, value) => {
      const newOptions = [...editForm.options];
      newOptions[index] = value;
      setEditForm((prev) => ({ ...prev, options: newOptions }));
    };
    const uploadQuestionImage = async (file) => {
      if (!file) return;
      setUploading(true);
      try {
        const safeName = file.name.replace(/\s/g, "_");
        const url = await window.db.uploadFile(`questions/${Date.now()}_${safeName}`, file);
        updateEditField("questionImageUrl", url);
        toast("G\xF6rsel y\xFCklendi", "success");
      } catch (e) {
        window.devError("Upload error:", e);
        toast("G\xF6rsel y\xFCklenirken hata olu\u015Ftu", "error");
      } finally {
        setUploading(false);
      }
    };
    const uploadOptionImage = async (file, index) => {
      if (!file) return;
      setUploading(true);
      try {
        const safeName = file.name.replace(/\s/g, "_");
        const url = await window.db.uploadFile(`options/${Date.now()}_${safeName}`, file);
        const newUrls = [...editForm.optionImageUrls];
        newUrls[index] = url;
        setEditForm((prev) => ({ ...prev, optionImageUrls: newUrls }));
        toast("Se\xE7enek g\xF6rseli y\xFCklendi", "success");
      } catch (e) {
        window.devError("Upload error:", e);
        toast("G\xF6rsel y\xFCklenirken hata olu\u015Ftu", "error");
      } finally {
        setUploading(false);
      }
    };
    const openEditModal = (suggestion) => {
      setEditForm({
        id: suggestion.id,
        questionText: suggestion.questionText,
        type: suggestion.type,
        category: suggestion.category,
        difficulty: suggestion.difficulty,
        options: suggestion.options || ["", "", "", ""],
        correctAnswer: suggestion.correctAnswer || "",
        hasTimer: suggestion.hasTimer || false,
        timerSeconds: suggestion.timerSeconds || 60,
        hasQuestionImage: Boolean(suggestion.questionImageUrl),
        hasImageOptions: suggestion.hasImageOptions || false,
        optionImageUrls: suggestion.optionImageUrls || ["", "", "", ""],
        questionImageUrl: suggestion.questionImageUrl || "",
        companyId: suggestion.companyId,
        suggestedBy: suggestion.suggestedBy
      });
      setEditErrors({});
      setShowEditModal(true);
    };
    const saveEditAndApprove = async () => {
      const validationErrors = validateQuestion(editForm);
      if (Object.keys(validationErrors).length > 0) {
        setEditErrors(validationErrors);
        toast("L\xFCtfen t\xFCm gerekli alanlar\u0131 doldurun", "error");
        return;
      }
      if (!confirm("Bu soruyu d\xFCzenlenmi\u015F haliyle soru havuzuna eklemek istedi\u011Finizden emin misiniz?")) return;
      setProcessing(true);
      try {
        const companyId = editForm.companyId || getDbCompanyId();
        if (!companyId) {
          throw new Error("\u015Eirket bilgisi bulunamad\u0131");
        }
        const questionData = {
          questionText: editForm.questionText,
          type: editForm.type,
          category: editForm.category,
          difficulty: editForm.difficulty,
          options: editForm.options || [],
          correctAnswer: editForm.correctAnswer || "",
          hasTimer: editForm.hasTimer || false,
          timerSeconds: editForm.timerSeconds || 60,
          hasImageOptions: editForm.hasImageOptions || false,
          optionImageUrls: editForm.optionImageUrls || [],
          questionImageUrl: editForm.questionImageUrl || "",
          isActive: true,
          suggestedBy: editForm.suggestedBy
        };
        await window.db.addQuestion(questionData, companyId);
        await window.db.deleteSuggestedQuestion(editForm.id);
        toast("Soru d\xFCzenlendi ve havuzuna eklendi!", "success");
        loadSuggestions();
        setShowEditModal(false);
        setEditForm(null);
      } catch (e) {
        window.devError("Save and approve error:", e);
        toast("Soru eklenirken hata olu\u015Ftu", "error");
      } finally {
        setProcessing(false);
      }
    };
    const approveSuggestion = async (suggestion) => {
      if (!confirm("Bu soruyu oldu\u011Fu gibi soru havuzuna eklemek istedi\u011Finizden emin misiniz?")) return;
      setProcessing(true);
      try {
        const companyId = suggestion.companyId || getDbCompanyId();
        if (!companyId) {
          throw new Error("\u015Eirket bilgisi bulunamad\u0131");
        }
        const questionData = {
          questionText: suggestion.questionText,
          type: suggestion.type,
          category: suggestion.category,
          difficulty: suggestion.difficulty,
          options: suggestion.options || [],
          correctAnswer: suggestion.correctAnswer || "",
          hasTimer: suggestion.hasTimer || false,
          timerSeconds: suggestion.timerSeconds || 60,
          hasImageOptions: suggestion.hasImageOptions || false,
          optionImageUrls: suggestion.optionImageUrls || [],
          questionImageUrl: suggestion.questionImageUrl || "",
          isActive: true,
          suggestedBy: suggestion.suggestedBy
        };
        await window.db.addQuestion(questionData, companyId);
        await window.db.deleteSuggestedQuestion(suggestion.id);
        toast("Soru havuzuna eklendi!", "success");
        loadSuggestions();
        setShowModal(false);
        setSelectedSuggestion(null);
      } catch (e) {
        window.devError("Approve error:", e);
        toast("Soru eklenirken hata olu\u015Ftu", "error");
      } finally {
        setProcessing(false);
      }
    };
    const rejectSuggestion = async (suggestionId) => {
      if (!confirm("Bu \xF6neriyi reddetmek istedi\u011Finizden emin misiniz? \xD6neri kal\u0131c\u0131 olarak silinecektir.")) return;
      setProcessing(true);
      try {
        await window.db.deleteSuggestedQuestion(suggestionId);
        toast("\xD6neri reddedildi ve silindi", "success");
        loadSuggestions();
        setShowModal(false);
        setSelectedSuggestion(null);
      } catch (e) {
        window.devError("Reject error:", e);
        toast("\xD6neri reddedilirken hata olu\u015Ftu", "error");
      } finally {
        setProcessing(false);
      }
    };
    const getStatusBadge = (status) => {
      if (status === "pending") return /* @__PURE__ */ React.createElement("span", { className: "chip bg-yellow-100 text-yellow-700 inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(ClockIcon, { size: 14, strokeWidth: 2 }), " Bekliyor");
      if (status === "approved") return /* @__PURE__ */ React.createElement("span", { className: "chip bg-green-100 text-green-700 inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(CheckCircleIcon, { size: 14, strokeWidth: 2 }), " Onayland\u0131");
      if (status === "rejected") return /* @__PURE__ */ React.createElement("span", { className: "chip bg-red-100 text-red-700 inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(XCircleIcon, { size: 14, strokeWidth: 2 }), " Reddedildi");
      return /* @__PURE__ */ React.createElement("span", { className: "chip" }, status);
    };
    const pendingCount = suggestions.filter((s) => s.status === "pending").length;
    if (loading) return /* @__PURE__ */ React.createElement(Page, { title: "Soru \xD6nerileri" }, /* @__PURE__ */ React.createElement(LoadingSpinner, null));
    return /* @__PURE__ */ React.createElement(
      Page,
      {
        title: "Soru \xD6nerileri",
        subtitle: `${suggestions.length} toplam \xF6neri, ${pendingCount} bekliyor`
      },
      /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "card p-4 bg-blue-50 border border-blue-200" }, /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-blue-600" }, suggestions.length), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-blue-700" }, "Toplam \xD6neri")), /* @__PURE__ */ React.createElement("div", { className: "card p-4 bg-yellow-50 border border-yellow-200" }, /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-yellow-600" }, pendingCount), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-yellow-700" }, "Bekleyen")), /* @__PURE__ */ React.createElement("div", { className: "card p-4 bg-green-50 border border-green-200" }, /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-green-600" }, suggestions.filter((s) => s.status === "approved").length), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-green-700" }, "Onaylanan"))), suggestions.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "card p-8 text-center text-dark-500" }, /* @__PURE__ */ React.createElement("div", { className: "text-6xl mb-4" }, "\u{1F4ED}"), /* @__PURE__ */ React.createElement("p", null, "Hen\xFCz soru \xF6nerisi yok.")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, suggestions.map((suggestion) => {
        var _a2, _b2;
        return /* @__PURE__ */ React.createElement("div", { key: suggestion.id, className: "card p-6 hover:shadow-lg transition-shadow" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col lg:flex-row gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3 flex-wrap" }, getStatusBadge(suggestion.status), /* @__PURE__ */ React.createElement("span", { className: "chip chip-blue" }, typeLabel(suggestion.type)), /* @__PURE__ */ React.createElement("span", { className: "chip chip-orange" }, suggestion.category), /* @__PURE__ */ React.createElement("span", { className: "chip bg-gray-200 text-gray-600" }, suggestion.difficulty === "easy" ? "Kolay" : suggestion.difficulty === "medium" ? "Orta" : "Zor")), /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-dark-900 mb-3 break-words", dangerouslySetInnerHTML: { __html: sanitizeHTML(suggestion.questionText) } }), suggestion.type === "mcq" && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-dark-600 mb-3 bg-gray-50 p-3 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold mb-1" }, "Se\xE7enekler:"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" }, suggestion.options.filter((o) => o).map((o, i) => /* @__PURE__ */ React.createElement("span", { key: i, className: `px-3 py-1 rounded-full text-xs ${o === suggestion.correctAnswer ? "bg-green-100 text-green-700 font-semibold" : "bg-gray-200 text-gray-700"}` }, o, " ", o === suggestion.correctAnswer && /* @__PURE__ */ React.createElement(CheckIcon, { size: 16, strokeWidth: 2 }))))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 text-xs text-dark-500 mt-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "\xD6neren:"), " ", (_a2 = suggestion.suggestedBy) == null ? void 0 : _a2.name, ((_b2 = suggestion.suggestedBy) == null ? void 0 : _b2.isAnonymous) && /* @__PURE__ */ React.createElement("span", { className: "text-yellow-600" }, " (Anonim)")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Tarih:"), " ", fmtDate(suggestion.createdAt)))), suggestion.status === "pending" && /* @__PURE__ */ React.createElement("div", { className: "flex lg:flex-col gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-sm bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-2",
            onClick: () => {
              setSelectedSuggestion(suggestion);
              setShowModal(true);
            }
          },
          /* @__PURE__ */ React.createElement(EyeIcon, { size: 18, strokeWidth: 2 }),
          /* @__PURE__ */ React.createElement("span", null, "Detay")
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-sm bg-purple-500 text-white hover:bg-purple-600 flex items-center gap-2",
            onClick: () => openEditModal(suggestion),
            disabled: processing
          },
          /* @__PURE__ */ React.createElement(PencilSquareIcon, { size: 18, strokeWidth: 2 }),
          /* @__PURE__ */ React.createElement("span", null, "D\xFCzenle")
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-sm bg-green-500 text-white hover:bg-green-600 flex items-center gap-2",
            onClick: () => approveSuggestion(suggestion),
            disabled: processing
          },
          /* @__PURE__ */ React.createElement(CheckCircleIcon, { size: 18, strokeWidth: 2 }),
          /* @__PURE__ */ React.createElement("span", null, "Onayla")
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-sm bg-red-500 text-white hover:bg-red-600 flex items-center gap-2",
            onClick: () => rejectSuggestion(suggestion.id),
            disabled: processing
          },
          /* @__PURE__ */ React.createElement(XCircleIcon, { size: 18, strokeWidth: 2 }),
          /* @__PURE__ */ React.createElement("span", null, "Reddet")
        ))));
      })), showModal && selectedSuggestion && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "overlay open", onClick: () => setShowModal(false), style: { zIndex: 998 } }), /* @__PURE__ */ React.createElement(
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
            maxWidth: "800px",
            width: "90%",
            maxHeight: "90vh",
            overflowY: "auto"
          }
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-dark-900" }, "Soru Detay\u0131"), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "text-dark-400 hover:text-dark-900 text-2xl",
            onClick: () => setShowModal(false)
          },
          "\xD7"
        )),
        /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Durum:"), " ", getStatusBadge(selectedSuggestion.status)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Soru:"), /* @__PURE__ */ React.createElement("p", { className: "text-dark-700 mt-1", dangerouslySetInnerHTML: { __html: sanitizeHTML(selectedSuggestion.questionText) } })), selectedSuggestion.questionImageUrl && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Soru G\xF6rseli:"), /* @__PURE__ */ React.createElement("img", { src: selectedSuggestion.questionImageUrl, alt: "Question", className: "mt-2 max-w-md rounded-lg border" })), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Tip:"), " ", typeLabel(selectedSuggestion.type)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Kategori:"), " ", selectedSuggestion.category), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Zorluk:"), " ", selectedSuggestion.difficulty === "easy" ? "Kolay" : selectedSuggestion.difficulty === "medium" ? "Orta" : "Zor")), selectedSuggestion.type === "mcq" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "Se\xE7enekler:"), selectedSuggestion.hasImageOptions ? /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4 mt-2" }, selectedSuggestion.options.map((o, i) => selectedSuggestion.optionImageUrls[i] && /* @__PURE__ */ React.createElement("div", { key: i, className: "border rounded-lg p-2" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-sm mb-1" }, o), /* @__PURE__ */ React.createElement("img", { src: selectedSuggestion.optionImageUrls[i], alt: `Option ${i + 1}`, className: "w-full rounded" })))) : /* @__PURE__ */ React.createElement("ul", { className: "list-disc list-inside mt-2" }, selectedSuggestion.options.filter((o) => o).map((o, i) => /* @__PURE__ */ React.createElement("li", { key: i, className: o === selectedSuggestion.correctAnswer ? "text-green-600 font-semibold" : "" }, o, " ", o === selectedSuggestion.correctAnswer && /* @__PURE__ */ React.createElement(CheckIcon, { size: 16, strokeWidth: 2 })))), /* @__PURE__ */ React.createElement("div", { className: "mt-2" }, /* @__PURE__ */ React.createElement("strong", null, "Do\u011Fru Cevap:"), " ", /* @__PURE__ */ React.createElement("span", { className: "text-green-600 font-semibold" }, selectedSuggestion.correctAnswer))), selectedSuggestion.hasTimer && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", null, "S\xFCre S\u0131n\u0131r\u0131:"), " ", selectedSuggestion.timerSeconds, " saniye"), /* @__PURE__ */ React.createElement("div", { className: "border-t pt-4" }, /* @__PURE__ */ React.createElement("strong", null, "\xD6neren Ki\u015Fi:"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-600 mt-1" }, (_a = selectedSuggestion.suggestedBy) == null ? void 0 : _a.name, ((_b = selectedSuggestion.suggestedBy) == null ? void 0 : _b.isAnonymous) && /* @__PURE__ */ React.createElement("span", { className: "text-yellow-600" }, " (Anonim Kullan\u0131c\u0131)"), /* @__PURE__ */ React.createElement("br", null), ((_c = selectedSuggestion.suggestedBy) == null ? void 0 : _c.email) && `${(_d = selectedSuggestion.suggestedBy) == null ? void 0 : _d.email}`, /* @__PURE__ */ React.createElement("br", null), fmtDate(selectedSuggestion.createdAt))), selectedSuggestion.status === "pending" && /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-4 border-t" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn bg-purple-500 text-white hover:bg-purple-600 flex-1",
            onClick: () => {
              setShowModal(false);
              openEditModal(selectedSuggestion);
            },
            disabled: processing
          },
          /* @__PURE__ */ React.createElement(PencilSquareIcon, { size: 18, strokeWidth: 2, className: "inline" }),
          " D\xFCzenle ve Onayla"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-primary flex-1",
            onClick: () => approveSuggestion(selectedSuggestion),
            disabled: processing
          },
          processing ? "\u0130\u015Fleniyor..." : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(CheckCircleIcon, { size: 18, strokeWidth: 2 }), " Oldu\u011Fu Gibi Onayla")
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn bg-red-500 text-white hover:bg-red-600 flex-1",
            onClick: () => rejectSuggestion(selectedSuggestion.id),
            disabled: processing
          },
          processing ? "\u0130\u015Fleniyor..." : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(XCircleIcon, { size: 18, strokeWidth: 2 }), " Reddet")
        )))
      )), showEditModal && editForm && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "overlay open", onClick: () => setShowEditModal(false), style: { zIndex: 998 } }), /* @__PURE__ */ React.createElement(
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
            maxWidth: "900px",
            width: "95%",
            maxHeight: "90vh",
            overflowY: "auto"
          }
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-dark-900 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(PencilSquareIcon, { size: 24, strokeWidth: 2 }), " Soruyu D\xFCzenle"), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "text-dark-400 hover:text-dark-900 text-2xl",
            onClick: () => setShowEditModal(false)
          },
          "\xD7"
        )),
        /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Soru Metni *"), /* @__PURE__ */ React.createElement(
          "textarea",
          {
            className: `field min-h-[100px] ${editErrors.questionText ? "error" : ""}`,
            value: editForm.questionText,
            onChange: (e) => updateEditField("questionText", e.target.value),
            placeholder: "Soru metnini giriniz..."
          }
        ), editErrors.questionText && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, editErrors.questionText)), /* @__PURE__ */ React.createElement("div", { className: "grid md:grid-cols-3 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Tip *"), /* @__PURE__ */ React.createElement("select", { className: `field ${editErrors.type ? "error" : ""}`, value: editForm.type, onChange: (e) => updateEditField("type", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "mcq" }, "\xC7oktan Se\xE7meli"), /* @__PURE__ */ React.createElement("option", { value: "open" }, "Klasik (Serbest Yan\u0131t)"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Kategori *"), /* @__PURE__ */ React.createElement(
          "input",
          {
            className: `field ${editErrors.category ? "error" : ""}`,
            value: editForm.category,
            onChange: (e) => updateEditField("category", e.target.value),
            placeholder: "\xDCr\xFCn Bilgisi"
          }
        ), editErrors.category && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, editErrors.category)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Zorluk *"), /* @__PURE__ */ React.createElement("select", { className: `field ${editErrors.difficulty ? "error" : ""}`, value: editForm.difficulty, onChange: (e) => updateEditField("difficulty", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "easy" }, "Kolay"), /* @__PURE__ */ React.createElement("option", { value: "medium" }, "Orta"), /* @__PURE__ */ React.createElement("option", { value: "hard" }, "Zor")))), editForm.type === "mcq" && /* @__PURE__ */ React.createElement(React.Fragment, null, !editForm.hasImageOptions && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Se\xE7enekler * (En az 2)"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, editForm.options.map((o, i) => /* @__PURE__ */ React.createElement(
          "input",
          {
            key: i,
            className: `field ${editErrors.options ? "error" : ""}`,
            value: o,
            onChange: (e) => updateEditOption(i, e.target.value),
            placeholder: `Se\xE7enek ${i + 1}`
          }
        ))), editErrors.options && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, editErrors.options)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Do\u011Fru Cevap *"), /* @__PURE__ */ React.createElement("select", { className: `field ${editErrors.correctAnswer ? "error" : ""}`, value: editForm.correctAnswer, onChange: (e) => updateEditField("correctAnswer", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Se\xE7iniz"), editForm.options.filter((o) => o.trim()).map((o, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: o }, o))), editErrors.correctAnswer && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, editErrors.correctAnswer))), editForm.hasImageOptions && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Se\xE7enek \u0130simleri * (K\u0131sa etiketler)"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dark-500 mb-2" }, 'Her g\xF6rsel i\xE7in k\u0131sa bir isim verin (\xF6rn: "A", "B", "C" veya "Se\xE7enek 1")'), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2" }, editForm.options.map((o, i) => /* @__PURE__ */ React.createElement(
          "input",
          {
            key: i,
            className: "field",
            value: o,
            onChange: (e) => updateEditOption(i, e.target.value),
            placeholder: `Etiket ${i + 1}`
          }
        )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Do\u011Fru Cevap *"), /* @__PURE__ */ React.createElement("select", { className: `field ${editErrors.correctAnswer ? "error" : ""}`, value: editForm.correctAnswer, onChange: (e) => updateEditField("correctAnswer", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Se\xE7iniz"), editForm.options.filter((o) => o.trim()).map((o, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: o }, o))), editErrors.correctAnswer && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, editErrors.correctAnswer)))), /* @__PURE__ */ React.createElement("div", { className: "card p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
          "img",
          {
            src: "assets/icons/timer-icon.png",
            alt: "Timer",
            className: "w-6 h-6",
            onError: (e) => {
              e.target.style.display = "none";
            }
          }
        ), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-dark-900" }, "S\xFCre S\u0131n\u0131r\u0131 Ekle"), /* @__PURE__ */ React.createElement("label", { className: "toggle-switch" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "checkbox",
            checked: editForm.hasTimer,
            onChange: (e) => updateEditField("hasTimer", e.target.checked)
          }
        ), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" }))), editForm.hasTimer && /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "S\xFCre (saniye)"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "number",
            className: "field",
            value: editForm.timerSeconds,
            onChange: (e) => updateEditField("timerSeconds", e.target.value),
            placeholder: "60",
            min: "10",
            max: "300"
          }
        ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dark-500 mt-1" }, "\xD6nerilen: 30-120 saniye aras\u0131"))), /* @__PURE__ */ React.createElement("div", { className: "card p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
          "img",
          {
            src: "assets/icons/image-icon.png",
            alt: "Image",
            className: "w-6 h-6",
            onError: (e) => {
              e.target.style.display = "none";
            }
          }
        ), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-dark-900" }, "G\xF6rsel Ekle"), /* @__PURE__ */ React.createElement("label", { className: "toggle-switch" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "checkbox",
            checked: editForm.hasQuestionImage,
            onChange: (e) => updateEditField("hasQuestionImage", e.target.checked)
          }
        ), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" }))), editForm.hasQuestionImage && /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, editForm.questionImageUrl ? /* @__PURE__ */ React.createElement("div", { className: "relative max-w-md mx-auto" }, /* @__PURE__ */ React.createElement("img", { src: editForm.questionImageUrl, alt: "Soru", className: "rounded-lg" }), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700",
            onClick: () => updateEditField("questionImageUrl", "")
          },
          /* @__PURE__ */ React.createElement(XMarkIcon, { size: 20, strokeWidth: 2 })
        )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "flex items-center justify-center cursor-pointer py-4",
            onClick: () => {
              var _a2;
              return (_a2 = questionImageRef.current) == null ? void 0 : _a2.click();
            },
            style: { pointerEvents: uploading ? "none" : "auto" }
          },
          uploading ? /* @__PURE__ */ React.createElement("span", { className: "text-dark-500" }, "Y\xFCkleniyor...") : /* @__PURE__ */ React.createElement(
            "img",
            {
              src: "assets/icons/upload-icon.png",
              alt: "Upload",
              className: "w-12 h-12",
              onError: (e) => {
                e.target.style.display = "none";
              }
            }
          )
        ), /* @__PURE__ */ React.createElement(
          "input",
          {
            ref: questionImageRef,
            type: "file",
            accept: "image/*",
            onChange: (e) => uploadQuestionImage(e.target.files[0]),
            style: { display: "none" }
          }
        ))), editForm.hasQuestionImage && editForm.type === "mcq" && /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-4 border-t border-dark-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-3" }, /* @__PURE__ */ React.createElement("label", { className: "toggle-switch" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "checkbox",
            checked: editForm.hasImageOptions,
            onChange: (e) => updateEditField("hasImageOptions", e.target.checked)
          }
        ), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" })), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-dark-700" }, "Se\xE7eneklerde G\xF6rsel Kullan")), editForm.hasImageOptions && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, editForm.options.map((o, i) => o.trim() && /* @__PURE__ */ React.createElement("div", { key: i, className: "space-y-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-semibold text-dark-700" }, "Se\xE7enek ", i + 1), editForm.optionImageUrls[i] ? /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "question-image-container" }, /* @__PURE__ */ React.createElement(
          "img",
          {
            src: editForm.optionImageUrls[i],
            alt: `Se\xE7enek ${i + 1}`,
            className: "w-full aspect-square object-cover rounded-lg"
          }
        )), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center",
            onClick: () => {
              const newUrls = [...editForm.optionImageUrls];
              newUrls[i] = "";
              updateEditField("optionImageUrls", newUrls);
            }
          },
          /* @__PURE__ */ React.createElement(XMarkIcon, { size: 16, strokeWidth: 2 })
        )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "flex items-center justify-center cursor-pointer py-3",
            onClick: () => {
              var _a2;
              return (_a2 = optionImageRefs.current[i]) == null ? void 0 : _a2.click();
            },
            style: { pointerEvents: uploading ? "none" : "auto" }
          },
          uploading ? /* @__PURE__ */ React.createElement("span", { className: "text-xs text-dark-500" }, "Y\xFCkleniyor...") : /* @__PURE__ */ React.createElement(
            "img",
            {
              src: "assets/icons/upload-icon.png",
              alt: "Upload",
              className: "w-8 h-8",
              onError: (e) => {
                e.target.style.display = "none";
              }
            }
          )
        ), /* @__PURE__ */ React.createElement(
          "input",
          {
            ref: (el) => optionImageRefs.current[i] = el,
            type: "file",
            accept: "image/*",
            onChange: (e) => uploadOptionImage(e.target.files[0], i),
            style: { display: "none" }
          }
        ))))))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-4 border-t" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-primary",
            onClick: saveEditAndApprove,
            disabled: processing || uploading
          },
          processing ? "Kaydediliyor..." : "Kaydet ve Onayla"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-ghost",
            onClick: () => setShowEditModal(false),
            disabled: processing
          },
          "\u0130ptal"
        )))
      )))
    );
  };
  window.SuggestedQuestions = SuggestedQuestions;
})();
