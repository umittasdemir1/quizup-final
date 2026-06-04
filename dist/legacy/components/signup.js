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
  const UserRoundIcon = () => /* @__PURE__ */ React.createElement("svg", { ...svgProps }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "8", r: "5" }), /* @__PURE__ */ React.createElement("path", { d: "M20 21a8 8 0 0 0-16 0" }));
  const BriefcaseBusinessIcon = () => /* @__PURE__ */ React.createElement("svg", { ...svgProps }, /* @__PURE__ */ React.createElement("path", { d: "M12 12h.01" }), /* @__PURE__ */ React.createElement("path", { d: "M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" }), /* @__PURE__ */ React.createElement("path", { d: "M22 13a18.15 18.15 0 0 1-20 0" }), /* @__PURE__ */ React.createElement("rect", { width: "20", height: "14", x: "2", y: "6", rx: "2" }));
  const MailIcon = () => /* @__PURE__ */ React.createElement("svg", { ...svgProps }, /* @__PURE__ */ React.createElement("rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }));
  const RectangleEllipsisIcon = () => /* @__PURE__ */ React.createElement("svg", { ...svgProps }, /* @__PURE__ */ React.createElement("rect", { width: "20", height: "12", x: "2", y: "6", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M12 12h.01" }), /* @__PURE__ */ React.createElement("path", { d: "M17 12h.01" }), /* @__PURE__ */ React.createElement("path", { d: "M7 12h.01" }));
  const EyeClosedIcon = () => /* @__PURE__ */ React.createElement("svg", { ...svgProps, className: "" }, /* @__PURE__ */ React.createElement("path", { d: "m15 18-.722-3.25" }), /* @__PURE__ */ React.createElement("path", { d: "M2 8a10.645 10.645 0 0 0 20 0" }), /* @__PURE__ */ React.createElement("path", { d: "m20 15-1.726-2.05" }), /* @__PURE__ */ React.createElement("path", { d: "m4 15 1.726-2.05" }), /* @__PURE__ */ React.createElement("path", { d: "m9 18 .722-3.25" }));
  const EyeIcon = () => /* @__PURE__ */ React.createElement("svg", { ...svgProps, className: "" }, /* @__PURE__ */ React.createElement("path", { d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" }));
  const Signup = () => {
    const [form, setForm] = useState({
      firstName: "",
      lastName: "",
      companyName: "",
      email: "",
      password: "",
      passwordConfirm: ""
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
    const handleSignup = async (e) => {
      var _a;
      e.preventDefault();
      if (!form.firstName.trim() || !form.lastName.trim() || !form.companyName.trim() || !form.email.trim() || !form.password) {
        toast("L\xFCtfen t\xFCm alanlar\u0131 doldurun", "error");
        return;
      }
      if (form.password.length < 6) {
        toast("\u015Eifre en az 6 karakter olmal\u0131", "error");
        return;
      }
      if (form.password !== form.passwordConfirm) {
        toast("\u015Eifreler e\u015Fle\u015Fmiyor", "error");
        return;
      }
      setLoading(true);
      try {
        if (!((_a = window.db) == null ? void 0 : _a.signUpAccount)) {
          throw new Error("Kay\u0131t servisi haz\u0131r de\u011Fil");
        }
        await window.db.signUpAccount({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          companyName: form.companyName.trim()
        });
        const userData = await window.signInWithSupabase(form.email.trim().toLowerCase(), form.password);
        toast("Hesab\u0131n\u0131z olu\u015Fturuldu, ho\u015F geldiniz!", "success");
        setTimeout(() => {
          location.hash = (userData == null ? void 0 : userData.role) === "tester" ? "#/tests" : "#/dashboard";
        }, 500);
      } catch (error) {
        window.devError("Signup error:", error);
        toast(error.message || "Kay\u0131t ba\u015Far\u0131s\u0131z", "error");
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
        className: "btn btn-outline px-4 sm:px-6 py-2",
        onClick: () => location.hash = "#/login"
      },
      "Giri\u015F Yap"
    )))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex items-center justify-center px-4" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-md w-full mx-auto py-12 relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "text-center mb-8" }, /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-bold text-dark-900 mb-2" }, "Hesap Olu\u015Ftur"), /* @__PURE__ */ React.createElement("p", { className: "text-dark-600" }, "Firman\u0131z i\xE7in \xFCcretsiz hesab\u0131n\u0131z\u0131 olu\u015Fturun")), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSignup, className: "auth-form space-y-5" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block mb-2" }, "Ad"), /* @__PURE__ */ React.createElement("div", { className: "field-with-icon" }, /* @__PURE__ */ React.createElement(UserRoundIcon, null), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "field",
        value: form.firstName,
        onChange: update("firstName"),
        disabled: loading
      }
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block mb-2" }, "Soyad"), /* @__PURE__ */ React.createElement("div", { className: "field-with-icon" }, /* @__PURE__ */ React.createElement(UserRoundIcon, null), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "field",
        value: form.lastName,
        onChange: update("lastName"),
        disabled: loading
      }
    )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block mb-2" }, "Firma Ad\u0131"), /* @__PURE__ */ React.createElement("div", { className: "field-with-icon" }, /* @__PURE__ */ React.createElement(BriefcaseBusinessIcon, null), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        className: "field",
        value: form.companyName,
        onChange: update("companyName"),
        disabled: loading
      }
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block mb-2" }, "Email"), /* @__PURE__ */ React.createElement("div", { className: "field-with-icon" }, /* @__PURE__ */ React.createElement(MailIcon, null), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "email",
        className: "field",
        value: form.email,
        onChange: update("email"),
        disabled: loading
      }
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block mb-2" }, "\u015Eifre"), /* @__PURE__ */ React.createElement("div", { className: "field-with-icon" }, /* @__PURE__ */ React.createElement(RectangleEllipsisIcon, null), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: showPassword ? "text" : "password",
        className: "field",
        value: form.password,
        onChange: update("password"),
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
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block mb-2" }, "\u015Eifre Tekrar"), /* @__PURE__ */ React.createElement("div", { className: "field-with-icon" }, /* @__PURE__ */ React.createElement(RectangleEllipsisIcon, null), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: showPasswordConfirm ? "text" : "password",
        className: "field",
        value: form.passwordConfirm,
        onChange: update("passwordConfirm"),
        disabled: loading
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "field-toggle",
        onClick: () => setShowPasswordConfirm((v) => !v),
        "aria-label": showPasswordConfirm ? "\u015Eifreyi gizle" : "\u015Eifreyi g\xF6ster"
      },
      showPasswordConfirm ? /* @__PURE__ */ React.createElement(EyeIcon, null) : /* @__PURE__ */ React.createElement(EyeClosedIcon, null)
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        className: "btn btn-primary w-full text-lg py-3",
        disabled: loading
      },
      loading ? "Hesap olu\u015Fturuluyor..." : "Kay\u0131t Ol"
    )), /* @__PURE__ */ React.createElement("div", { className: "text-center mt-6 text-sm text-dark-600" }, "Zaten hesab\u0131n var m\u0131?", " ", /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "text-primary-600 font-semibold hover:underline",
        onClick: () => location.hash = "#/login"
      },
      "Giri\u015F Yap"
    )))));
  };
  window.Signup = Signup;
})();
