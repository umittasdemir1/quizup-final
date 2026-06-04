(() => {
  const { useState } = React;
  const svgProps = {
    className: "field-icon",
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  };
  const MailIcon = () => /* @__PURE__ */ React.createElement("svg", { ...svgProps }, /* @__PURE__ */ React.createElement("rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }));
  const RectangleEllipsisIcon = () => /* @__PURE__ */ React.createElement("svg", { ...svgProps }, /* @__PURE__ */ React.createElement("rect", { width: "20", height: "12", x: "2", y: "6", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M12 12h.01" }), /* @__PURE__ */ React.createElement("path", { d: "M17 12h.01" }), /* @__PURE__ */ React.createElement("path", { d: "M7 12h.01" }));
  const EyeClosedIcon = () => /* @__PURE__ */ React.createElement("svg", { ...svgProps, className: "" }, /* @__PURE__ */ React.createElement("path", { d: "m15 18-.722-3.25" }), /* @__PURE__ */ React.createElement("path", { d: "M2 8a10.645 10.645 0 0 0 20 0" }), /* @__PURE__ */ React.createElement("path", { d: "m20 15-1.726-2.05" }), /* @__PURE__ */ React.createElement("path", { d: "m4 15 1.726-2.05" }), /* @__PURE__ */ React.createElement("path", { d: "m9 18 .722-3.25" }));
  const EyeIcon = () => /* @__PURE__ */ React.createElement("svg", { ...svgProps, className: "" }, /* @__PURE__ */ React.createElement("path", { d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" }));
  const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
          if (userData.role === "tester") {
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
    return /* @__PURE__ */ React.createElement("div", { className: "bg-landing min-h-screen flex flex-col relative" }, /* @__PURE__ */ React.createElement("header", { className: "w-full relative z-20" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: "assets/logo.svg",
        alt: "QuizUp+",
        style: { width: "150px", height: "auto" },
        className: "cursor-pointer",
        onClick: () => location.hash = "#/"
      }
    ), /* @__PURE__ */ React.createElement("nav", { className: "flex items-center gap-2 sm:gap-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn btn-primary px-4 sm:px-6 py-2",
        onClick: () => location.hash = "#/signup"
      },
      "Kay\u0131t Ol"
    )))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex items-center justify-center px-4" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-md w-full mx-auto py-12 relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "text-center mb-8" }, /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-bold text-dark-900 mb-2" }, "Ho\u015F Geldiniz"), /* @__PURE__ */ React.createElement("p", { className: "text-dark-600" }, "Devam etmek i\xE7in giri\u015F yap\u0131n")), /* @__PURE__ */ React.createElement("form", { onSubmit: handleLogin, className: "auth-form space-y-5" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block mb-2" }, "Email"), /* @__PURE__ */ React.createElement("div", { className: "field-with-icon" }, /* @__PURE__ */ React.createElement(MailIcon, null), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "email",
        className: "field",
        value: email,
        onChange: (e) => setEmail(e.target.value),
        disabled: loading
      }
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block mb-2" }, "\u015Eifre"), /* @__PURE__ */ React.createElement("div", { className: "field-with-icon" }, /* @__PURE__ */ React.createElement(RectangleEllipsisIcon, null), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: showPassword ? "text" : "password",
        className: "field",
        value: password,
        onChange: (e) => setPassword(e.target.value),
        disabled: loading
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "field-toggle",
        onClick: () => setShowPassword((v) => !v),
        "aria-label": showPassword ? "\u015Eifreyi gizle" : "\u015Eifreyi g\xF6ster"
      },
      showPassword ? /* @__PURE__ */ React.createElement(EyeIcon, null) : /* @__PURE__ */ React.createElement(EyeClosedIcon, null)
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        className: "btn btn-primary w-full text-lg py-3",
        disabled: loading
      },
      loading ? "Giri\u015F yap\u0131l\u0131yor..." : "Giri\u015F Yap"
    )), /* @__PURE__ */ React.createElement("div", { className: "text-center mt-6 text-sm text-dark-600" }, "Hesab\u0131n yok mu?", " ", /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "text-primary-600 font-semibold hover:underline",
        onClick: () => location.hash = "#/signup"
      },
      "Kay\u0131t Ol"
    )))));
  };
  window.Login = Login;
})();
