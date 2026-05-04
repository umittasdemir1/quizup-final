(() => {
  const { useState, useEffect, useRef } = React;
  const Branding = () => {
    const [logoUrl, setLogoUrl] = useState("");
    const [searchPlaceholderWords, setSearchPlaceholderWords] = useState("");
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState("");
    const fileInputRef = useRef(null);
    const currentUser = getCurrentUser();
    const isAdminUser = (currentUser == null ? void 0 : currentUser.role) === "admin" || (currentUser == null ? void 0 : currentUser.isSuperAdmin) === true;
    const isSuperAdminUser = (currentUser == null ? void 0 : currentUser.isSuperAdmin) === true;
    useEffect(() => {
      const loadCompanies = async () => {
        var _a;
        try {
          if (isSuperAdminUser) {
            const all = await window.db.getCompanies();
            const companiesList = all.map((c) => ({ id: c._supabaseId, name: c.displayName || c.name }));
            setCompanies(companiesList);
            const selectedComp = getSelectedCompany();
            if (selectedComp && selectedComp !== "all") {
              const found = companiesList.find((c) => c.id === selectedComp || c.name === selectedComp);
              setSelectedCompany(found ? found.id : ((_a = companiesList[0]) == null ? void 0 : _a.id) || "");
            } else if (companiesList.length > 0) {
              setSelectedCompany(companiesList[0].id);
            }
          } else if (currentUser == null ? void 0 : currentUser.companyId) {
            const displayName = currentUser.companyName || currentUser.company;
            setCompanies([{ id: currentUser.companyId, name: displayName }]);
            setSelectedCompany(currentUser.companyId);
          }
        } catch (e) {
          window.devError("Companies load error:", e);
        }
      };
      loadCompanies();
    }, []);
    useEffect(() => {
      if (!isSuperAdminUser) return;
      const handleCompanyChange = () => {
        const selectedComp = getSelectedCompany();
        if (selectedComp && selectedComp !== "all") {
          setSelectedCompany(selectedComp);
        } else if (selectedComp === "all" && companies.length > 0) {
          setSelectedCompany(companies[0].id);
        }
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => window.removeEventListener("company-changed", handleCompanyChange);
    }, [companies, isSuperAdminUser]);
    useEffect(() => {
      if (!selectedCompany) return;
      (async () => {
        setLoading(true);
        try {
          const brandingData = await window.db.getBranding(selectedCompany);
          if (brandingData) {
            setLogoUrl(brandingData.logoUrl || "");
            setSearchPlaceholderWords(brandingData.searchPlaceholderWords || "");
          } else {
            setLogoUrl("");
            setSearchPlaceholderWords("");
          }
        } catch (e) {
          window.devError("Settings load error:", e);
        } finally {
          setLoading(false);
        }
      })();
    }, [selectedCompany]);
    const handleFileSelect = (file) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast("L\xFCtfen bir resim dosyas\u0131 se\xE7in", "error");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast("Dosya boyutu en fazla 2MB olabilir", "error");
        return;
      }
      uploadLogo(file);
    };
    const uploadLogo = async (file) => {
      if (!selectedCompany) {
        toast("L\xFCtfen \xF6nce bir \u015Firket se\xE7in", "error");
        return;
      }
      setUploading(true);
      try {
        const companyInfo = companies.find((c) => c.id === selectedCompany);
        const companyName = (companyInfo == null ? void 0 : companyInfo.name) || selectedCompany;
        const url = await window.db.uploadFile(`branding/${companyName}/logo_${Date.now()}`, file);
        await window.db.setBranding(selectedCompany, { logoUrl: url, searchPlaceholderWords });
        setLogoUrl(url);
        toast(`${companyName} i\xE7in logo ba\u015Far\u0131yla y\xFCklendi`, "success");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (e) {
        window.devError("Upload error:", e);
        toast("Logo y\xFCklenirken hata olu\u015Ftu", "error");
      } finally {
        setUploading(false);
      }
    };
    const deleteLogo = async () => {
      if (!selectedCompany) {
        toast("L\xFCtfen \xF6nce bir \u015Firket se\xE7in", "error");
        return;
      }
      if (!confirm("Logo'yu silmek istedi\u011Finizden emin misiniz?")) return;
      try {
        await window.db.setBranding(selectedCompany, { logoUrl: "", searchPlaceholderWords });
        setLogoUrl("");
        toast("Logo silindi", "success");
      } catch (e) {
        window.devError("Delete error:", e);
        toast("Logo silinirken hata olu\u015Ftu", "error");
      }
    };
    const saveSearchPlaceholderWords = async () => {
      if (!selectedCompany) {
        toast("L\xFCtfen \xF6nce bir \u015Firket se\xE7in", "error");
        return;
      }
      setSaving(true);
      try {
        const companyInfo = companies.find((c) => c.id === selectedCompany);
        const companyName = (companyInfo == null ? void 0 : companyInfo.name) || selectedCompany;
        await window.db.setBranding(selectedCompany, { logoUrl, searchPlaceholderWords });
        toast(`${companyName} i\xE7in arama placeholder kelimeleri kaydedildi`, "success");
      } catch (e) {
        window.devError("Save error:", e);
        toast("Kaydetme s\u0131ras\u0131nda hata olu\u015Ftu", "error");
      } finally {
        setSaving(false);
      }
    };
    const handleDragOver = (e) => {
      e.preventDefault();
      e.currentTarget.classList.add("dragover");
    };
    const handleDragLeave = (e) => {
      e.preventDefault();
      e.currentTarget.classList.remove("dragover");
    };
    const handleDrop = (e) => {
      e.preventDefault();
      e.currentTarget.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    };
    if (loading && !selectedCompany) return /* @__PURE__ */ React.createElement(Page, { title: "Marka Ayarlar\u0131" }, /* @__PURE__ */ React.createElement(LoadingSpinner, { text: "Y\xFCkleniyor..." }));
    return /* @__PURE__ */ React.createElement(Page, { title: "Marka Ayarlar\u0131", subtitle: "Logo ve marka g\xF6rsellerinizi y\xF6netin" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-4xl mx-auto" }, companies.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "card p-6 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement(BuildingOfficeIcon, { size: 24, strokeWidth: 2, className: "text-primary-500 flex-shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, isAdminUser ? "\u015Eirket Se\xE7in" : "\u015Eirketiniz"), /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "field w-full",
        style: { paddingRight: "2.5rem" },
        value: selectedCompany,
        onChange: (e) => setSelectedCompany(e.target.value),
        disabled: !isAdminUser || companies.length === 1
      },
      companies.map((company) => /* @__PURE__ */ React.createElement("option", { key: company.id, value: company.id }, company.name))
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dark-500 mt-1" }, isAdminUser ? "Se\xE7ilen \u015Firkete ait marka ayarlar\u0131n\u0131 d\xFCzenleyebilirsiniz." : "Sadece kendi \u015Firketinizin marka ayarlar\u0131n\u0131 d\xFCzenleyebilirsiniz.")))), /* @__PURE__ */ React.createElement("div", { className: "grid lg:grid-cols-2 gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-dark-900 mb-4" }, "Logo Y\xFCkle"), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "upload-area",
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
        onClick: () => {
          var _a;
          return (_a = fileInputRef.current) == null ? void 0 : _a.click();
        }
      },
      uploading ? /* @__PURE__ */ React.createElement(LoadingSpinner, { text: "Y\xFCkleniyor..." }) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "text-5xl mb-3" }, /* @__PURE__ */ React.createElement(ArrowUpTrayIcon, { size: 64, strokeWidth: 1.5, className: "inline text-primary-500" })), /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-dark-900 mb-1" }, "Dosya se\xE7in veya s\xFCr\xFCkleyin"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-600 mb-3" }, "PNG, JPG, SVG (Max 2MB)"), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "btn btn-primary"
        },
        "Dosya Se\xE7"
      ))
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: fileInputRef,
        type: "file",
        accept: "image/*",
        onChange: (e) => handleFileSelect(e.target.files[0]),
        style: { display: "none" }
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "mt-4 p-4 bg-secondary-50 rounded-lg border border-secondary-200" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-700 flex items-start gap-2" }, /* @__PURE__ */ React.createElement(LightBulbIcon, { size: 18, strokeWidth: 2, className: "flex-shrink-0 text-primary-500 mt-0.5" }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "\u0130pucu:"), " Logo transparan arka plana sahip olmal\u0131 ve kare format\u0131nda olmal\u0131d\u0131r (\xF6rn: 512x512px).")))), /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-dark-900 mb-4" }, "\xD6nizleme"), logoUrl ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "glass-brand-logo-card mx-auto mb-4" }, /* @__PURE__ */ React.createElement("img", { src: logoUrl, alt: "Logo Preview" })), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-600 text-center mb-4" }, "Ana sayfada b\xF6yle g\xF6r\xFCnecek"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-danger w-full flex items-center justify-center gap-2", onClick: deleteLogo }, /* @__PURE__ */ React.createElement(TrashIcon, { size: 18, strokeWidth: 2 }), "Logo'yu Sil")) : /* @__PURE__ */ React.createElement("div", { className: "glass-brand-logo-card mx-auto mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 text-center" }, "Logo yok")))), /* @__PURE__ */ React.createElement("div", { className: "card p-6 mt-6" }, /* @__PURE__ */ React.createElement("h3", { className: "headline-small text-dark-900 mb-2" }, "Arama Placeholder Kelimeleri"), /* @__PURE__ */ React.createElement("p", { className: "body-small text-dark-600 mb-4" }, "Search placeholder'da g\xF6r\xFCnecek kelimeleri buraya virg\xFClle ay\u0131rarak yaz\u0131n. \xD6rne\u011Fin: ", /* @__PURE__ */ React.createElement("b", null, "COLM, BM WATCH OCEANIC, NEVILLE"), ". Virg\xFClle ayr\u0131lm\u0131\u015F her kelime s\u0131rayla placeholder animasyonunda kullan\u0131lacakt\u0131r."), /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-2 text-dark-700" }, "Placeholder Kelimeleri (virg\xFClle ay\u0131r\u0131n)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "field w-full body-medium",
        placeholder: "COLM, BM WATCH OCEANIC, NEVILLE",
        value: searchPlaceholderWords,
        onChange: (e) => setSearchPlaceholderWords(e.target.value)
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dark-500 mt-1" }, "Her kelime animasyonda s\u0131rayla yaz\u0131l\u0131p silinecektir.")), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn btn-primary",
        onClick: saveSearchPlaceholderWords,
        disabled: saving
      },
      saving ? "Kaydediliyor..." : "Kaydet"
    )), /* @__PURE__ */ React.createElement("div", { className: "grid md:grid-cols-2 gap-4 mt-6" }, /* @__PURE__ */ React.createElement("div", { className: "card p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-2xl" }, /* @__PURE__ */ React.createElement(CheckCircleIcon, { size: 32, strokeWidth: 1.5, className: "text-green-600" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "font-semibold text-dark-900 mb-1" }, "\xD6nerilen Format"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-600" }, "PNG veya SVG, transparan arka plan")))), /* @__PURE__ */ React.createElement("div", { className: "card p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-2xl" }, /* @__PURE__ */ React.createElement(PhotoIcon, { size: 32, strokeWidth: 1.5, className: "text-primary-500" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "font-semibold text-dark-900 mb-1" }, "\xD6nerilen Boyut"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-600" }, "512x512px - 1024x1024px (Kare)")))))));
  };
  window.Branding = Branding;
})();
