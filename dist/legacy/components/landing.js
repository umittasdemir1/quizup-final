(() => {
  const Landing = () => {
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
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn btn-primary px-4 sm:px-6 py-2",
        onClick: () => location.hash = "#/signup"
      },
      "Kay\u0131t Ol"
    )))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex items-center justify-center px-4" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-2xl w-full mx-auto py-16 flex flex-col items-center text-center relative z-10" }, /* @__PURE__ */ React.createElement("h2", { className: "display-medium text-dark-900 hero-subtitle mb-4" }, "Test Et. \xD6\u011Fren. Seviye Atla."), /* @__PURE__ */ React.createElement("p", { className: "body-large text-dark-600 mb-10 max-w-lg" }, "Ekibiniz i\xE7in modern quiz ve de\u011Ferlendirme platformu. Saniyeler i\xE7inde ba\u015Flay\u0131n."), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "btn btn-primary px-10 py-4",
        onClick: () => location.hash = "#/signup"
      },
      "Hemen Ba\u015Fla"
    ))));
  };
  window.Landing = Landing;
})();
