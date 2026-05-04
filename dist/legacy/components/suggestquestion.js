(() => {
  const { useState, useRef } = React;
  const SuggestQuestion = () => {
    const currentUser = getCurrentUser();
    const isAnonymous = !currentUser || currentUser.isAnonymous;
    const [form, setForm] = useState({
      questionText: "",
      type: "mcq",
      category: "",
      difficulty: "medium",
      options: ["", "", "", ""],
      correctAnswer: "",
      hasTimer: false,
      timerSeconds: 60,
      hasQuestionImage: false,
      questionImageUrl: "",
      hasImageOptions: false,
      optionImageUrls: ["", "", "", ""],
      // For anonymous users
      suggestorName: ""
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const questionImageRef = useRef(null);
    const optionImageRefs = useRef([]);
    const updateField = (key, value) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (errors[key]) {
        setErrors((prev) => ({ ...prev, [key]: null }));
      }
    };
    const updateOption = (index, value) => {
      const newOptions = [...form.options];
      newOptions[index] = value;
      setForm((prev) => ({ ...prev, options: newOptions }));
    };
    const uploadQuestionImage = async (file) => {
      if (!file) return;
      setUploading(true);
      try {
        const safeName = file.name.replace(/\s/g, "_");
        const url = await window.db.uploadFile(`questions/${Date.now()}_${safeName}`, file);
        updateField("questionImageUrl", url);
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
        const newUrls = [...form.optionImageUrls];
        newUrls[index] = url;
        setForm((prev) => ({ ...prev, optionImageUrls: newUrls }));
        toast("Se\xE7enek g\xF6rseli y\xFCklendi", "success");
      } catch (e) {
        window.devError("Upload error:", e);
        toast("G\xF6rsel y\xFCklenirken hata olu\u015Ftu", "error");
      } finally {
        setUploading(false);
      }
    };
    const handleSubmit = async () => {
      var _a;
      window.devLog("=== SUBMIT STARTED ===");
      window.devLog("Current User:", currentUser);
      window.devLog("Is Anonymous:", isAnonymous);
      window.devLog("Form Data:", form);
      const validationErrors = validateQuestion(form);
      window.devLog("Validation Errors:", validationErrors);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        toast("L\xFCtfen t\xFCm gerekli alanlar\u0131 doldurun", "error");
        return;
      }
      if (isAnonymous && !((_a = form.suggestorName) == null ? void 0 : _a.trim())) {
        window.devLog("ERROR: Anonymous user name required");
        setErrors((prev) => ({ ...prev, suggestorName: "Ad soyad gereklidir" }));
        toast("L\xFCtfen ad\u0131n\u0131z\u0131 ve soyad\u0131n\u0131z\u0131 girin", "error");
        return;
      }
      setSaving(true);
      try {
        const companyId = (currentUser == null ? void 0 : currentUser.companyId) || await window.db.resolveCompanyId((currentUser == null ? void 0 : currentUser.company) || "BLUEMINT");
        if (!companyId) {
          throw new Error("\u015Eirket bilgisi bulunamad\u0131");
        }
        const suggestion = {
          questionText: form.questionText,
          type: form.type,
          category: form.category,
          difficulty: form.difficulty,
          options: form.options,
          correctAnswer: form.correctAnswer,
          hasTimer: form.hasTimer,
          timerSeconds: form.timerSeconds,
          hasQuestionImage: form.hasQuestionImage,
          questionImageUrl: form.questionImageUrl,
          hasImageOptions: form.hasImageOptions,
          optionImageUrls: form.optionImageUrls,
          status: "pending",
          // pending, approved, rejected
          suggestedBy: isAnonymous ? {
            uid: null,
            email: null,
            name: form.suggestorName,
            isAnonymous: true
          } : {
            uid: currentUser.uid,
            email: currentUser.email,
            name: `${currentUser.firstName} ${currentUser.lastName}`,
            isAnonymous: false
          }
        };
        window.devLog("Suggestion Object:", suggestion);
        const saved = await window.db.addSuggestedQuestion(suggestion, companyId);
        window.devLog("SUCCESS! Suggestion ID:", saved.id);
        toast("Soru \xF6neriniz g\xF6nderildi! Te\u015Fekk\xFCrler", "success");
        setForm({
          questionText: "",
          type: "mcq",
          category: "",
          difficulty: "medium",
          options: ["", "", "", ""],
          correctAnswer: "",
          hasTimer: false,
          timerSeconds: 60,
          hasQuestionImage: false,
          questionImageUrl: "",
          hasImageOptions: false,
          optionImageUrls: ["", "", "", ""],
          suggestorName: isAnonymous ? form.suggestorName : ""
        });
        setErrors({});
        if (questionImageRef.current) questionImageRef.current.value = "";
        optionImageRefs.current.forEach((ref) => {
          if (ref) ref.value = "";
        });
      } catch (e) {
        window.devError("Submit error:", e);
        toast("Soru \xF6nerisi g\xF6nderilirken hata olu\u015Ftu", "error");
      } finally {
        setSaving(false);
      }
    };
    return /* @__PURE__ */ React.createElement(Page, { title: "Soru \xD6ner", subtitle: "Soru havuzuna katk\u0131da bulunun!" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6" }, /* @__PURE__ */ React.createElement("strong", null, /* @__PURE__ */ React.createElement(DocumentTextIcon, { size: 16, strokeWidth: 2, className: "inline" }), " Not:"), " \xD6nerdi\u011Finiz sorular admin taraf\u0131ndan incelendikten sonra soru havuzuna eklenecektir."), isAnonymous && /* @__PURE__ */ React.createElement("div", { className: "card p-6 mb-6 border-2 border-yellow-300 bg-yellow-50" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-dark-900 mb-4" }, "\u0130leti\u015Fim Bilgileriniz"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Ad\u0131n\u0131z Soyad\u0131n\u0131z *"), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: `field ${errors.suggestorName ? "error" : ""}`,
        value: form.suggestorName,
        onChange: (e) => updateField("suggestorName", e.target.value),
        placeholder: "Ahmet Y\u0131lmaz"
      }
    ), errors.suggestorName && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, errors.suggestorName))), /* @__PURE__ */ React.createElement("div", { className: "card p-6 mb-6 space-y-4" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-dark-900" }, "Yeni Soru \xD6ner"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Soru Metni *"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        className: `field min-h-[100px] ${errors.questionText ? "error" : ""}`,
        value: form.questionText,
        onChange: (e) => updateField("questionText", e.target.value),
        placeholder: "Soru metnini giriniz..."
      }
    ), errors.questionText && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, errors.questionText)), /* @__PURE__ */ React.createElement("div", { className: "grid md:grid-cols-3 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Tip *"), /* @__PURE__ */ React.createElement("select", { className: `field ${errors.type ? "error" : ""}`, value: form.type, onChange: (e) => updateField("type", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "mcq" }, "\xC7oktan Se\xE7meli"), /* @__PURE__ */ React.createElement("option", { value: "open" }, "Klasik (Serbest Yan\u0131t)"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Kategori *"), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: `field ${errors.category ? "error" : ""}`,
        value: form.category,
        onChange: (e) => updateField("category", e.target.value),
        placeholder: "\xDCr\xFCn Bilgisi"
      }
    ), errors.category && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, errors.category)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Zorluk *"), /* @__PURE__ */ React.createElement("select", { className: `field ${errors.difficulty ? "error" : ""}`, value: form.difficulty, onChange: (e) => updateField("difficulty", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "easy" }, "Kolay"), /* @__PURE__ */ React.createElement("option", { value: "medium" }, "Orta"), /* @__PURE__ */ React.createElement("option", { value: "hard" }, "Zor")))), form.type === "mcq" && /* @__PURE__ */ React.createElement(React.Fragment, null, !form.hasImageOptions && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Se\xE7enekler * (En az 2)"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, form.options.map((o, i) => /* @__PURE__ */ React.createElement(
      "input",
      {
        key: i,
        className: `field ${errors.options ? "error" : ""}`,
        value: o,
        onChange: (e) => updateOption(i, e.target.value),
        placeholder: `Se\xE7enek ${i + 1}`
      }
    ))), errors.options && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, errors.options)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Do\u011Fru Cevap *"), /* @__PURE__ */ React.createElement("select", { className: `field ${errors.correctAnswer ? "error" : ""}`, value: form.correctAnswer, onChange: (e) => updateField("correctAnswer", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Se\xE7iniz"), form.options.filter((o) => o.trim()).map((o, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: o }, o))), errors.correctAnswer && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, errors.correctAnswer))), form.hasImageOptions && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Se\xE7enek \u0130simleri * (K\u0131sa etiketler)"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dark-500 mb-2" }, 'Her g\xF6rsel i\xE7in k\u0131sa bir isim verin (\xF6rn: "A", "B", "C" veya "Se\xE7enek 1")'), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2" }, form.options.map((o, i) => /* @__PURE__ */ React.createElement(
      "input",
      {
        key: i,
        className: "field",
        value: o,
        onChange: (e) => updateOption(i, e.target.value),
        placeholder: `Etiket ${i + 1}`
      }
    )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Do\u011Fru Cevap *"), /* @__PURE__ */ React.createElement("select", { className: `field ${errors.correctAnswer ? "error" : ""}`, value: form.correctAnswer, onChange: (e) => updateField("correctAnswer", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Se\xE7iniz"), form.options.filter((o) => o.trim()).map((o, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: o }, o))), errors.correctAnswer && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, errors.correctAnswer)))), /* @__PURE__ */ React.createElement("div", { className: "card p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
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
        checked: form.hasTimer,
        onChange: (e) => updateField("hasTimer", e.target.checked)
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" }))), form.hasTimer && /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "S\xFCre (saniye)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        className: "field",
        value: form.timerSeconds,
        onChange: (e) => updateField("timerSeconds", e.target.value),
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
        checked: form.hasQuestionImage,
        onChange: (e) => updateField("hasQuestionImage", e.target.checked)
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" }))), form.hasQuestionImage && /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, form.questionImageUrl ? /* @__PURE__ */ React.createElement("div", { className: "relative max-w-md mx-auto" }, /* @__PURE__ */ React.createElement("img", { src: form.questionImageUrl, alt: "Soru", className: "rounded-lg" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700",
        onClick: () => updateField("questionImageUrl", "")
      },
      /* @__PURE__ */ React.createElement(XMarkIcon, { size: 20, strokeWidth: 2 })
    )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "flex items-center justify-center cursor-pointer py-4",
        onClick: () => {
          var _a;
          return (_a = questionImageRef.current) == null ? void 0 : _a.click();
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
    ))), form.hasQuestionImage && form.type === "mcq" && /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-4 border-t border-dark-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-3" }, /* @__PURE__ */ React.createElement("label", { className: "toggle-switch" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: form.hasImageOptions,
        onChange: (e) => updateField("hasImageOptions", e.target.checked)
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "toggle-slider" })), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-dark-700" }, "Se\xE7eneklerde G\xF6rsel Kullan")), form.hasImageOptions && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, form.options.map((o, i) => o.trim() && /* @__PURE__ */ React.createElement("div", { key: i, className: "space-y-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-semibold text-dark-700" }, "Se\xE7enek ", i + 1), form.optionImageUrls[i] ? /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "question-image-container" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: form.optionImageUrls[i],
        alt: `Se\xE7enek ${i + 1}`,
        className: "w-full aspect-square object-cover rounded-lg"
      }
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center",
        onClick: () => {
          const newUrls = [...form.optionImageUrls];
          newUrls[i] = "";
          updateField("optionImageUrls", newUrls);
        }
      },
      /* @__PURE__ */ React.createElement(XMarkIcon, { size: 16, strokeWidth: 2 })
    )) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "flex items-center justify-center cursor-pointer py-3",
        onClick: () => {
          var _a;
          return (_a = optionImageRefs.current[i]) == null ? void 0 : _a.click();
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
    ))))))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-2" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleSubmit, disabled: saving || uploading }, saving ? "G\xF6nderiliyor..." : "Soru \xD6ner")))));
  };
  window.SuggestQuestion = SuggestQuestion;
})();
