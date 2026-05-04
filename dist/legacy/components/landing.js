(() => {
  const { useState, useEffect } = React;
  const Landing = () => {
    const [showDemoModal, setShowDemoModal] = useState(false);
    const [demoSettings, setDemoSettings] = useState(null);
    const [timeLeft, setTimeLeft] = useState("");
    const [demoForm, setDemoForm] = useState({
      fullName: "",
      companyName: "",
      email: "",
      password: ""
    });
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
      const loadDemoSettings = async () => {
        try {
          if (!window.supabase) {
            return;
          }
          const { data, error } = await window.supabase.from("settings").select("value").eq("key", "demoFeature").maybeSingle();
          if (error) {
            throw error;
          }
          if (data == null ? void 0 : data.value) {
            const settings = data.value;
            setDemoSettings(settings);
            if (settings.enabled && settings.endDate) {
              const calculateTime = () => {
                const now = /* @__PURE__ */ new Date();
                const end = new Date(settings.endDate);
                const diff = end - now;
                if (diff <= 0) {
                  setTimeLeft("Sona erdi");
                  return;
                }
                const days = Math.floor(diff / (1e3 * 60 * 60 * 24));
                const hours = Math.floor(diff % (1e3 * 60 * 60 * 24) / (1e3 * 60 * 60));
                setTimeLeft(`${days} g\xFCn ${hours} saat`);
              };
              calculateTime();
              const interval = setInterval(calculateTime, 6e4);
              return () => clearInterval(interval);
            }
          }
        } catch (error) {
          window.devError("Demo settings load error:", error);
        }
      };
      loadDemoSettings();
    }, []);
    const handleDemoSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      try {
        if (!demoForm.fullName.trim() || !demoForm.companyName.trim() || !demoForm.email.trim() || !demoForm.password.trim()) {
          toast("L\xFCtfen t\xFCm alanlar\u0131 doldurun", "error");
          return;
        }
        if (demoForm.password.length < 6) {
          toast("\u015Eifre en az 6 karakter olmal\u0131", "error");
          return;
        }
        toast("Demo hesap olu\u015Fturma Supabase Edge Function ta\u015F\u0131mas\u0131 tamamlan\u0131nca a\xE7\u0131lacak.", "warning");
      } catch (error) {
        window.devError("Demo account creation error:", error);
        toast(error.message || "Demo hesap olu\u015Fturulamad\u0131", "error");
      } finally {
        setSubmitting(false);
      }
    };
    const isDemoAvailable = (demoSettings == null ? void 0 : demoSettings.enabled) && new Date(demoSettings.endDate) > /* @__PURE__ */ new Date();
    return /* @__PURE__ */ React.createElement("div", { className: "bg-landing min-h-screen flex items-center justify-center relative" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12 items-center relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-6 flex flex-col items-center md:items-start text-center md:text-left" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-center md:justify-start mb-2" }, /* @__PURE__ */ React.createElement("img", { src: "assets/logo.svg", alt: "QuizUp+", style: { width: "250px", height: "auto" } })), /* @__PURE__ */ React.createElement("h2", { className: "display-medium text-dark-900 hero-subtitle" }, "Test. Learn.", /* @__PURE__ */ React.createElement("br", null), "Level Up."), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3 hero-btn w-full md:w-auto" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn btn-primary px-8 py-4",
        onClick: () => location.hash = "#/login"
      },
      "Get Started"
    ), isDemoAvailable && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn btn-secondary px-8 py-4 flex items-center justify-center gap-2",
        onClick: () => setShowDemoModal(true)
      },
      /* @__PURE__ */ React.createElement("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 10V3L4 14h7v7l9-11h-7z" })),
      "Demo Hesab\u0131 Olu\u015Ftur"
    ), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-dark-600 flex items-center justify-center md:justify-start gap-1" }, /* @__PURE__ */ React.createElement("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" })), "Demo talebi ", timeLeft, " sonra kapanacak")), !isDemoAvailable && demoSettings && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-dark-600 flex flex-col items-center md:items-start gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium" }, "Demo D\xF6nemi Sona Erdi"), /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "mailto:tasdemir_umit@hotmail.com?subject=QuizUp%2B%20Demo%20Talebi&body=Merhaba%2C%20QuizUp%2B%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.",
        className: "btn btn-outline px-6 py-2 text-sm"
      },
      "Bize Ula\u015F\u0131n"
    ))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-8 pt-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "headline-large text-primary-500" }, "1000+"), /* @__PURE__ */ React.createElement("div", { className: "body-medium text-dark-600" }, "Sorular")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "headline-large text-secondary-500" }, "500+"), /* @__PURE__ */ React.createElement("div", { className: "body-medium text-dark-600" }, "Kullan\u0131c\u0131")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "headline-large text-accent-500" }, "95%"), /* @__PURE__ */ React.createElement("div", { className: "body-medium text-dark-600" }, "Ba\u015Far\u0131 Oran\u0131")))), /* @__PURE__ */ React.createElement("div", { className: "hero-image relative" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl border-4 border-secondary-500 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "bg-secondary-500 px-4 py-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 rounded-full bg-secondary-200" }), /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 rounded-full bg-secondary-200" }), /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 rounded-full bg-secondary-200" }), /* @__PURE__ */ React.createElement("div", { className: "ml-auto" }, /* @__PURE__ */ React.createElement("svg", { className: "w-16 h-16", viewBox: "0 0 100 100", fill: "white" }, /* @__PURE__ */ React.createElement("rect", { x: "20", y: "20", width: "60", height: "60", rx: "8", fill: "none", stroke: "currentColor", strokeWidth: "6" }), /* @__PURE__ */ React.createElement("rect", { x: "30", y: "30", width: "15", height: "15", rx: "2", fill: "currentColor" }), /* @__PURE__ */ React.createElement("rect", { x: "55", y: "30", width: "15", height: "15", rx: "2", fill: "currentColor" }), /* @__PURE__ */ React.createElement("rect", { x: "30", y: "55", width: "15", height: "15", rx: "2", fill: "currentColor" }), /* @__PURE__ */ React.createElement("rect", { x: "55", y: "55", width: "15", height: "15", rx: "2", fill: "currentColor" })))), /* @__PURE__ */ React.createElement("div", { className: "p-8 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-secondary-100 w-20 h-20 rounded-2xl flex items-center justify-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl" }, "?")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "h-3 bg-gray-200 rounded-full w-full" }), /* @__PURE__ */ React.createElement("div", { className: "h-3 bg-gray-200 rounded-full w-4/5" }), /* @__PURE__ */ React.createElement("div", { className: "h-3 bg-gray-200 rounded-full w-3/4" })), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 rounded-full bg-accent-500 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-white text-2xl font-bold" }, "\u2713"))), /* @__PURE__ */ React.createElement("div", { className: "bg-accent-500 h-12 rounded-xl w-full" }))), /* @__PURE__ */ React.createElement("div", { className: "absolute -top-6 -right-6 w-24 h-24 bg-primary-500 rounded-full opacity-20 animate-bounce-soft" }), /* @__PURE__ */ React.createElement("div", { className: "absolute -bottom-8 -left-8 w-32 h-32 bg-accent-500 rounded-full opacity-20 animate-bounce-soft", style: { animationDelay: "0.3s" } })))), showDemoModal && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-bold text-dark-900" }, "Demo Hesab\u0131 Olu\u015Ftur"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowDemoModal(false),
        className: "text-dark-600 hover:text-dark-900"
      },
      /* @__PURE__ */ React.createElement("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }))
    )), /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-4 bg-secondary-50 rounded-lg border border-secondary-200" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("svg", { className: "w-5 h-5 text-secondary-600 flex-shrink-0 mt-0.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" })), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-dark-700" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium mb-1" }, "Demo Hesap \xD6zellikleri:"), /* @__PURE__ */ React.createElement("ul", { className: "list-disc list-inside space-y-1 text-dark-600" }, /* @__PURE__ */ React.createElement("li", null, "7 g\xFCn s\xFCre"), /* @__PURE__ */ React.createElement("li", null, "Maksimum 1 admin, 3 y\xF6netici"), /* @__PURE__ */ React.createElement("li", null, "Maksimum 25 soru"))))), /* @__PURE__ */ React.createElement("form", { onSubmit: handleDemoSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-dark-700 mb-1" }, "\u0130sim Soyisim"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: demoForm.fullName,
        onChange: (e) => setDemoForm({ ...demoForm, fullName: e.target.value }),
        className: "w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500",
        placeholder: "Ahmet Y\u0131lmaz",
        required: true
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-dark-700 mb-1" }, "\u015Eirket Ad\u0131"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: demoForm.companyName,
        onChange: (e) => setDemoForm({ ...demoForm, companyName: e.target.value }),
        className: "w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500",
        placeholder: "ABC Teknoloji",
        required: true
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-dark-700 mb-1" }, "E-posta"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "email",
        value: demoForm.email,
        onChange: (e) => setDemoForm({ ...demoForm, email: e.target.value }),
        className: "w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500",
        placeholder: "ahmet@example.com",
        required: true
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-dark-700 mb-1" }, "\u015Eifre"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        value: demoForm.password,
        onChange: (e) => setDemoForm({ ...demoForm, password: e.target.value }),
        className: "w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500",
        placeholder: "En az 6 karakter",
        minLength: 6,
        required: true
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setShowDemoModal(false),
        className: "flex-1 px-4 py-3 border border-dark-300 rounded-lg hover:bg-dark-50 transition-colors",
        disabled: submitting
      },
      "\u0130ptal"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        className: "flex-1 px-4 py-3 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        disabled: submitting
      },
      submitting ? "Olu\u015Fturuluyor..." : "Olu\u015Ftur"
    ))))));
  };
  window.Landing = Landing;
})();
