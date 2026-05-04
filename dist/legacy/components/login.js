(() => {
  const { useState } = React;
  const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const handleLogin = async (e) => {
      var _a, _b;
      e.preventDefault();
      if (!email || !password) {
        toast("L\xFCtfen t\xFCm alanlar\u0131 doldurun", "error");
        return;
      }
      setLoading(true);
      try {
        if (!window.signInWithSupabase) {
          throw new Error("Supabase auth haz\u0131r de\u011Fil");
        }
        const userData = await window.signInWithSupabase(email.trim().toLowerCase(), password);
        if (!userData) {
          toast("Kullan\u0131c\u0131 bilgileri bulunamad\u0131", "error");
          return;
        }
        toast("Giri\u015F ba\u015Far\u0131l\u0131!", "success");
        setTimeout(() => {
          if (userData.role === "admin") {
            location.hash = "#/dashboard";
          } else if (userData.role === "manager") {
            location.hash = "#/dashboard";
          } else if (userData.role === "tester") {
            location.hash = "#/tests";
          } else {
            location.hash = "#/dashboard";
          }
        }, 500);
      } catch (error) {
        window.devError("Login error:", error);
        if ((_a = error.message) == null ? void 0 : _a.toLowerCase().includes("invalid login credentials")) {
          toast("Email veya \u015Fifre hatal\u0131", "error");
        } else if ((_b = error.message) == null ? void 0 : _b.toLowerCase().includes("email")) {
          toast("Ge\xE7ersiz email adresi", "error");
        } else {
          toast("Giri\u015F ba\u015Far\u0131s\u0131z", "error");
        }
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { className: "bg-landing min-h-screen flex items-center justify-center relative px-4" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-md w-full relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "card p-8 space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mb-4" }, /* @__PURE__ */ React.createElement("img", { src: "assets/logo.svg", alt: "QuizUp+", style: { width: "180px", height: "auto" } })), /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-bold text-dark-900 mb-2" }, "Ho\u015F Geldiniz"), /* @__PURE__ */ React.createElement("p", { className: "text-dark-600" }, "Devam etmek i\xE7in giri\u015F yap\u0131n")), /* @__PURE__ */ React.createElement("form", { onSubmit: handleLogin, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Email"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "email",
        className: "field",
        placeholder: "ornek@email.com",
        value: email,
        onChange: (e) => setEmail(e.target.value),
        disabled: loading
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "\u015Eifre"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        className: "field",
        placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
        value: password,
        onChange: (e) => setPassword(e.target.value),
        disabled: loading
      }
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        className: "btn btn-primary w-full text-lg py-3",
        disabled: loading
      },
      loading ? "Giri\u015F yap\u0131l\u0131yor..." : "Giri\u015F Yap"
    )), /* @__PURE__ */ React.createElement("div", { className: "text-center pt-4 border-t border-gray-200" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "text-sm text-dark-600 hover:text-primary-600 transition-colors",
        onClick: () => location.hash = "#/"
      },
      "\u2190 Ana sayfaya d\xF6n"
    ))), /* @__PURE__ */ React.createElement("div", { className: "absolute -top-6 -right-6 w-24 h-24 bg-primary-500 rounded-full opacity-20 animate-bounce-soft" }), /* @__PURE__ */ React.createElement("div", { className: "absolute -bottom-8 -left-8 w-32 h-32 bg-accent-500 rounded-full opacity-20 animate-bounce-soft", style: { animationDelay: "0.3s" } })));
  };
  window.Login = Login;
})();
