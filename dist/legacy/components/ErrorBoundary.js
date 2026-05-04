(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  const { Component } = React;
  class ErrorBoundary extends Component {
    constructor(props) {
      super(props);
      __publicField(this, "handleReload", () => {
        window.location.reload();
      });
      __publicField(this, "handleGoHome", () => {
        window.location.hash = "#/";
        window.location.reload();
      });
      this.state = { hasError: false, error: null, errorInfo: null };
    }
    static getDerivedStateFromError(error) {
      return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
      window.devError("ErrorBoundary caught an error:", error, errorInfo);
      this.setState({
        error,
        errorInfo
      });
      if (window.logError) {
        window.logError({
          error: error.toString(),
          errorInfo: errorInfo.componentStack,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        });
      }
      if (window.toast) {
        window.toast("Bir hata olu\u015Ftu. Sayfa yenileniyor...", "error", 5e3);
      }
    }
    render() {
      if (this.state.hasError) {
        return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-2xl w-full" }, /* @__PURE__ */ React.createElement("div", { className: "card p-8 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center" }, /* @__PURE__ */ React.createElement("svg", { className: "w-12 h-12 text-red-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" })))), /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-bold text-dark-900 mb-4" }, "Bir Hata Olu\u015Ftu"), /* @__PURE__ */ React.createElement("p", { className: "text-dark-600 mb-6" }, "\xDCzg\xFCn\xFCz, beklenmeyen bir hata olu\u015Ftu. L\xFCtfen sayfay\u0131 yenileyin veya ana sayfaya d\xF6n\xFCn."), window.location.hostname === "localhost" && this.state.error && /* @__PURE__ */ React.createElement("details", { className: "text-left bg-gray-50 rounded-lg p-4 mb-6" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer font-semibold text-dark-700 mb-2" }, "Hata Detaylar\u0131 (Geli\u015Ftirici Modu)"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-red-600 font-mono break-words" }, /* @__PURE__ */ React.createElement("p", { className: "mb-2" }, /* @__PURE__ */ React.createElement("strong", null, "Hata:"), " ", this.state.error.toString()), this.state.errorInfo && /* @__PURE__ */ React.createElement("pre", { className: "bg-white p-3 rounded overflow-auto max-h-48 text-xs" }, this.state.errorInfo.componentStack))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 justify-center" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-primary",
            onClick: this.handleReload
          },
          "\u{1F504} Sayfay\u0131 Yenile"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-ghost",
            onClick: this.handleGoHome
          },
          "\u{1F3E0} Ana Sayfaya D\xF6n"
        )), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-500 mt-6" }, "Sorun devam ederse, l\xFCtfen sistem y\xF6neticinizle ileti\u015Fime ge\xE7in."))));
      }
      return this.props.children;
    }
  }
  window.ErrorBoundary = ErrorBoundary;
})();
