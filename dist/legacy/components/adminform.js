(() => {
  const AdminForm = ({
    form,
    errors,
    editId,
    saving,
    uploading,
    questionImageRef,
    optionImageRefs,
    updateField,
    updateOption,
    uploadQuestionImage,
    uploadOptionImage,
    handleSave,
    reset
  }) => {
    return /* @__PURE__ */ React.createElement("div", { className: "card p-6 mb-6 space-y-4" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-bold text-dark-900" }, editId ? "Soru D\xFCzenle" : "Yeni Soru Ekle"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Soru Metni *"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        className: `field min-h-[100px] ${errors.questionText ? "error" : ""}`,
        value: form.questionText,
        onChange: (e) => updateField("questionText", e.target.value),
        placeholder: "Soru metnini giriniz..."
      }
    ), errors.questionText && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, errors.questionText)), /* @__PURE__ */ React.createElement("div", { className: "grid md:grid-cols-4 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Soru Numaras\u0131 *"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        min: "1",
        className: `field ${errors.orderNumber ? "error" : ""}`,
        value: form.orderNumber,
        onChange: (e) => updateField("orderNumber", e.target.value),
        placeholder: "1"
      }
    ), errors.orderNumber && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, errors.orderNumber)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Tip *"), /* @__PURE__ */ React.createElement("select", { className: `field ${errors.type ? "error" : ""}`, value: form.type, onChange: (e) => updateField("type", e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "mcq" }, "\xC7oktan Se\xE7meli"), /* @__PURE__ */ React.createElement("option", { value: "open" }, "Klasik (Serbest Yan\u0131t)"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Kategori *"), /* @__PURE__ */ React.createElement(
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
    ))))))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        id: "isActive",
        checked: form.isActive,
        onChange: (e) => updateField("isActive", e.target.checked),
        className: "w-5 h-5"
      }
    ), /* @__PURE__ */ React.createElement("label", { htmlFor: "isActive", className: "text-sm font-semibold text-dark-700" }, "Aktif")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-2" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleSave, disabled: saving }, saving ? "Kaydediliyor..." : editId ? "G\xFCncelle" : "Kaydet"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-ghost", onClick: reset, disabled: saving }, "\u0130ptal")));
  };
  window.AdminForm = AdminForm;
})();
