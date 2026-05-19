(() => {
  const { useState, useEffect } = React;
  const Sidebar = () => {
    var _a, _b;
    const [open, setOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [userMenuAnchor, setUserMenuAnchor] = useState(null);
    const [pendingSuggestions, setPendingSuggestions] = useState(0);
    const route = useHash();
    const [currentUser, setCurrentUser] = useState(getCurrentUser());
    const [showUserInfoModal, setShowUserInfoModal] = useState(false);
    const [userInfoLoading, setUserInfoLoading] = useState(false);
    const [userInfoForm, setUserInfoForm] = useState({
      firstName: "",
      lastName: "",
      company: "",
      department: "",
      position: "",
      applicationPin: ""
    });
    const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
    const [savingUserInfo, setSavingUserInfo] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showSignOutAllModal, setShowSignOutAllModal] = useState(false);
    const [signOutAllPin, setSignOutAllPin] = useState("");
    const [signingOutAll, setSigningOutAll] = useState(false);
    const [signOutAllError, setSignOutAllError] = useState("");
    const isLoggedIn = currentUser !== null;
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(() => {
      try {
        return localStorage.getItem("superadmin:selectedCompany") || "all";
      } catch {
        return "all";
      }
    });
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
    const [companiesLoading, setCompaniesLoading] = useState(false);
    useEffect(() => {
      if (isLoggedIn && ((currentUser == null ? void 0 : currentUser.role) === "admin" || (currentUser == null ? void 0 : currentUser.role) === "SuperAdmin" || isSuperAdmin())) {
        loadPendingCount();
        const interval = setInterval(loadPendingCount, 3e4);
        return () => clearInterval(interval);
      }
    }, [isLoggedIn, currentUser]);
    useEffect(() => {
      const syncUser = () => {
        setCurrentUser(getCurrentUser());
      };
      window.addEventListener("user-info-updated", syncUser);
      window.addEventListener("quizup-auth-state", syncUser);
      window.addEventListener("storage", syncUser);
      return () => {
        window.removeEventListener("user-info-updated", syncUser);
        window.removeEventListener("quizup-auth-state", syncUser);
        window.removeEventListener("storage", syncUser);
      };
    }, []);
    const loadPendingCount = async () => {
      try {
        const user = getCurrentUser();
        if (!user || user.role !== "admin" && user.role !== "SuperAdmin" && !user.isSuperAdmin) {
          window.devLog("Skipping pending count load: User is not admin");
          return;
        }
        let companyId = user.companyId || null;
        if (user.isSuperAdmin) {
          try {
            const selected = JSON.parse(localStorage.getItem("superadmin:selectedCompanyData") || "null");
            companyId = (selected == null ? void 0 : selected.id) && selected.id !== "all" ? selected.id : null;
          } catch {
            companyId = null;
          }
        }
        const suggestions = await window.db.getSuggestedQuestions(companyId);
        const pendingCount = suggestions.filter((s) => s.status === "pending").length;
        setPendingSuggestions(pendingCount);
        window.devLog("Pending suggestions count:", pendingCount);
      } catch (e) {
        window.devError("Load pending count error:", e);
      }
    };
    const loadCompanies = async () => {
      if (!isSuperAdmin()) return;
      setCompaniesLoading(true);
      try {
        const companiesList = await window.db.getCompanies();
        setCompanies(companiesList);
        window.devLog("Companies loaded:", companiesList.length);
        if (!localStorage.getItem("superadmin:selectedCompanyData")) {
          localStorage.setItem("superadmin:selectedCompany", "all");
          localStorage.setItem("superadmin:selectedCompanyData", JSON.stringify({ id: "all", name: "all" }));
          window.devLog('Initialized localStorage with "all" companies');
        }
      } catch (e) {
        window.devError("Load companies error:", e);
        toast("\u015Eirketler y\xFCklenemedi", "error");
      } finally {
        setCompaniesLoading(false);
      }
    };
    useEffect(() => {
      if (isLoggedIn && isSuperAdmin()) {
        loadCompanies();
      }
    }, [isLoggedIn, currentUser]);
    const handleCompanyChange = (companyId) => {
      setSelectedCompany(companyId);
      setShowCompanyDropdown(false);
      try {
        const companyData = companies.find((c) => c.id === companyId || c._supabaseId === companyId);
        const dataToStore = companyId === "all" ? JSON.stringify({ id: "all", name: "all" }) : JSON.stringify({ id: companyId, name: (companyData == null ? void 0 : companyData.name) || companyId });
        localStorage.setItem("superadmin:selectedCompany", companyId);
        localStorage.setItem("superadmin:selectedCompanyData", dataToStore);
        window.dispatchEvent(new CustomEvent("company-changed", { detail: { companyId } }));
        toast(companyId === "all" ? "T\xFCm \u015Firketler g\xF6r\xFCnt\xFCleniyor" : `\u015Eirket de\u011Fi\u015Ftirildi: ${(companyData == null ? void 0 : companyData.name) || companyId}`, "success");
      } catch (e) {
        window.devError("Error saving selected company:", e);
      }
    };
    const closeUserMenu = () => {
      setShowUserMenu(false);
      setUserMenuAnchor(null);
    };
    const toggleUserMenu = (anchor) => {
      setShowUserMenu((prev) => {
        if (prev && userMenuAnchor === anchor) {
          setUserMenuAnchor(null);
          return false;
        }
        setUserMenuAnchor(anchor);
        return true;
      });
    };
    const openUserInfoModal = async () => {
      if (!(currentUser == null ? void 0 : currentUser.uid)) return;
      closeUserMenu();
      setUserInfoForm({
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        company: currentUser.companyName || currentUser.company || "",
        department: currentUser.department || "",
        position: currentUser.position || "",
        applicationPin: currentUser.applicationPin && /^\d{4}$/.test(currentUser.applicationPin) ? currentUser.applicationPin : ""
      });
      setShowUserInfoModal(true);
      setUserInfoLoading(true);
      try {
        const profile = await window.db.getProfileById(currentUser.uid);
        if (profile) {
          setUserInfoForm({
            firstName: profile.firstName || "",
            lastName: profile.lastName || "",
            company: profile.companyName || profile.company || "",
            department: profile.department || "",
            position: profile.position || "",
            applicationPin: profile.applicationPin && /^\d{4}$/.test(profile.applicationPin) ? profile.applicationPin : ""
          });
        }
      } catch (error) {
        window.devError("Kullan\u0131c\u0131 bilgileri y\xFCklenemedi:", error);
        toast("Kullan\u0131c\u0131 bilgileri y\xFCklenemedi", "error");
      } finally {
        setUserInfoLoading(false);
      }
    };
    const closeUserInfoModal = () => {
      setShowUserInfoModal(false);
      setUserInfoLoading(false);
      setSavingUserInfo(false);
      setChangingPassword(false);
      setPasswordForm({ current: "", new: "", confirm: "" });
    };
    const openSignOutAllModal = () => {
      closeUserMenu();
      setSignOutAllPin("");
      setSignOutAllError("");
      setSigningOutAll(false);
      setShowSignOutAllModal(true);
    };
    const closeSignOutAllModal = () => {
      setShowSignOutAllModal(false);
      setSignOutAllPin("");
      setSignOutAllError("");
      setSigningOutAll(false);
    };
    const handleSignOutAllDevices = async (e) => {
      e.preventDefault();
      if (!(currentUser == null ? void 0 : currentUser.uid)) {
        toast("Kullan\u0131c\u0131 oturumu bulunamad\u0131", "error");
        return;
      }
      const normalizedPin = signOutAllPin.trim();
      if (!normalizedPin || !/^\d{4}$/.test(normalizedPin)) {
        setSignOutAllError("PIN 4 haneli olmal\u0131d\u0131r");
        return;
      }
      const expectedPin = (currentUser == null ? void 0 : currentUser.applicationPin) && /^\d{4}$/.test(currentUser.applicationPin) ? currentUser.applicationPin : "";
      if (!expectedPin) {
        setSignOutAllError("\xD6nce profilinizden uygulama PIN\u2019i belirleyin.");
        return;
      }
      if (normalizedPin !== expectedPin) {
        setSignOutAllError("Uygulama PIN'i hatal\u0131!");
        return;
      }
      setSignOutAllError("");
      setSigningOutAll(true);
      window.__manualLogoutInProgress = true;
      try {
        await window.supabase.auth.signOut({ scope: "global" });
        closeSignOutAllModal();
        await logout({
          toastMessage: "T\xFCm cihazlardan \xE7\u0131k\u0131\u015F yap\u0131ld\u0131",
          toastKind: "success",
          redirect: "#/login"
        });
      } catch (error) {
        window.devError("T\xFCm cihazlardan \xE7\u0131k\u0131\u015F yap\u0131l\u0131rken hata olu\u015Ftu:", error);
        toast("T\xFCm cihazlardan \xE7\u0131k\u0131\u015F yap\u0131lamad\u0131", "error");
      } finally {
        setSigningOutAll(false);
        if (window.__manualLogoutInProgress) {
          window.__manualLogoutInProgress = false;
        }
      }
    };
    const handleUserInfoSave = async (e) => {
      var _a2, _b2, _c;
      e.preventDefault();
      if (!(currentUser == null ? void 0 : currentUser.uid)) {
        toast("Kullan\u0131c\u0131 oturumu bulunamad\u0131", "error");
        return;
      }
      if (!userInfoForm.firstName || !userInfoForm.lastName) {
        toast("\u0130sim ve soyisim zorunludur", "error");
        return;
      }
      if (!userInfoForm.applicationPin || !/^\d{4}$/.test(userInfoForm.applicationPin.trim())) {
        toast("Uygulama PIN'i 4 haneli olmal\u0131d\u0131r", "error");
        return;
      }
      setSavingUserInfo(true);
      try {
        const trimmedFirstName = userInfoForm.firstName.trim();
        const trimmedLastName = userInfoForm.lastName.trim();
        const trimmedDepartment = ((_a2 = userInfoForm.department) == null ? void 0 : _a2.trim()) || null;
        const trimmedPosition = ((_b2 = userInfoForm.position) == null ? void 0 : _b2.trim()) || null;
        const normalizedPin = (_c = userInfoForm.applicationPin) == null ? void 0 : _c.trim();
        const applicationPin = normalizedPin;
        await window.db.updateProfile(currentUser.uid, {
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          department: trimmedDepartment,
          position: trimmedPosition,
          applicationPin
        });
        const updatedUser = {
          ...currentUser,
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          department: trimmedDepartment || "",
          position: trimmedPosition || "",
          applicationPin
        };
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        window.dispatchEvent(new Event("user-info-updated"));
        toast("Bilgileriniz g\xFCncellendi", "success");
        setShowUserInfoModal(false);
      } catch (error) {
        window.devError("Kullan\u0131c\u0131 bilgileri g\xFCncellenirken hata olu\u015Ftu:", error);
        toast("Kullan\u0131c\u0131 bilgileri g\xFCncellenirken hata olu\u015Ftu", "error");
      } finally {
        setSavingUserInfo(false);
      }
    };
    const handlePasswordChange = async (e) => {
      var _a2, _b2, _c;
      e.preventDefault();
      if (!(currentUser == null ? void 0 : currentUser.uid)) {
        toast("Kullan\u0131c\u0131 oturumu bulunamad\u0131", "error");
        return;
      }
      if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
        toast("L\xFCtfen t\xFCm \u015Fifre alanlar\u0131n\u0131 doldurun", "error");
        return;
      }
      if (passwordForm.new.length < 6) {
        toast("Yeni \u015Fifre en az 6 karakter olmal\u0131d\u0131r", "error");
        return;
      }
      if (passwordForm.new !== passwordForm.confirm) {
        toast("Yeni \u015Fifreler e\u015Fle\u015Fmiyor", "error");
        return;
      }
      setChangingPassword(true);
      try {
        const session = await window.supabase.auth.getSession();
        if (!((_a2 = session.data) == null ? void 0 : _a2.session)) {
          toast("Oturum bulunamad\u0131. L\xFCtfen tekrar giri\u015F yap\u0131n.", "error");
          setChangingPassword(false);
          return;
        }
        const verify = await window.supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: passwordForm.current
        });
        if (verify.error) throw verify.error;
        const { error } = await window.supabase.auth.updateUser({ password: passwordForm.new });
        if (error) throw error;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        setCurrentUser(currentUser);
        window.dispatchEvent(new Event("user-info-updated"));
        toast("\u015Eifreniz g\xFCncellendi", "success");
        setPasswordForm({ current: "", new: "", confirm: "" });
      } catch (error) {
        window.devError("\u015Eifre g\xFCncellenirken hata olu\u015Ftu:", error);
        if ((_b2 = error.message) == null ? void 0 : _b2.toLowerCase().includes("invalid login credentials")) {
          toast("Mevcut \u015Fifreniz yanl\u0131\u015F", "error");
        } else if ((_c = error.message) == null ? void 0 : _c.toLowerCase().includes("password")) {
          toast("Yeni \u015Fifre \xE7ok zay\u0131f", "error");
        } else {
          toast("\u015Eifre g\xFCncellenirken hata olu\u015Ftu", "error");
        }
      } finally {
        setChangingPassword(false);
      }
    };
    const handleLogout = async () => {
      closeUserMenu();
      setShowSignOutAllModal(false);
      setSignOutAllPin("");
      setSignOutAllError("");
      try {
        await logout();
      } finally {
        setCurrentUser(getCurrentUser());
        window.dispatchEvent(new Event("user-info-updated"));
      }
    };
    const isActive = (path) => {
      if (path === "/") return route === "/";
      if (path === "/suggest" || path === "/suggestions") {
        return route === path;
      }
      return route.startsWith(path);
    };
    useEffect(() => {
      if (open) {
        setOpen(false);
      }
      closeUserMenu();
      setCurrentUser(getCurrentUser());
    }, [route]);
    const hideSidebar = route === "/" || route === "/login" || route.startsWith("/login") || route.startsWith("/quiz/");
    const handleLogoClick = () => {
      if (isLoggedIn && ((currentUser == null ? void 0 : currentUser.role) === "admin" || (currentUser == null ? void 0 : currentUser.role) === "manager" || (currentUser == null ? void 0 : currentUser.role) === "SuperAdmin" || isSuperAdmin())) {
        location.hash = "#/dashboard";
      } else {
        location.hash = "#/";
      }
    };
    const firstInitial = (value) => {
      var _a2;
      return ((_a2 = value == null ? void 0 : value.trim) == null ? void 0 : _a2.call(value)) ? value.trim()[0].toUpperCase() : "";
    };
    const avatarInitials = (() => {
      var _a2;
      if (!isLoggedIn) {
        return "?";
      }
      const initials = `${firstInitial(currentUser == null ? void 0 : currentUser.firstName)}${firstInitial(currentUser == null ? void 0 : currentUser.lastName)}`.trim();
      if (initials) {
        return initials;
      }
      if ((_a2 = currentUser == null ? void 0 : currentUser.email) == null ? void 0 : _a2.length) {
        return currentUser.email[0].toUpperCase();
      }
      return "?";
    })();
    const displayName = isLoggedIn ? [currentUser == null ? void 0 : currentUser.firstName, currentUser == null ? void 0 : currentUser.lastName].filter(Boolean).join(" ").trim() || (currentUser == null ? void 0 : currentUser.email) || "Kullan\u0131c\u0131" : "Misafir Kullan\u0131c\u0131";
    const displayCompany = isLoggedIn ? (currentUser == null ? void 0 : currentUser.companyName) || ((_a = currentUser == null ? void 0 : currentUser.company) == null ? void 0 : _a.trim()) || "\u015Eirket bilgisi yok" : "Oturum a\xE7\u0131lmad\u0131";
    const renderUserMenuContent = () => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "p-4 border-b border-gray-200" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-dark-900" }, displayName), (currentUser == null ? void 0 : currentUser.email) && /* @__PURE__ */ React.createElement("div", { className: "text-sm text-dark-500" }, currentUser.email), (currentUser == null ? void 0 : currentUser.position) && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dark-400 mt-1" }, currentUser.position)), /* @__PURE__ */ React.createElement("div", { className: "p-2 space-y-1" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "w-full text-left px-4 py-2 text-sm text-dark-600 hover:bg-gray-100 rounded-lg transition-colors",
        onClick: openUserInfoModal
      },
      "\u{1F464} Kullan\u0131c\u0131 Bilgileri"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "w-full text-left px-4 py-2 text-sm text-dark-600 hover:bg-gray-100 rounded-lg transition-colors",
        onClick: openSignOutAllModal
      },
      "\u{1F510} T\xFCm cihazlarda oturumu kapat"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors",
        onClick: handleLogout
      },
      "\u{1F6AA} \xC7\u0131k\u0131\u015F Yap"
    )));
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "overlay " + (open ? "open" : ""),
        onClick: () => setOpen(false)
      }
    ), !hideSidebar && /* @__PURE__ */ React.createElement("div", { className: "sidebar " + (open ? "open" : "") }, /* @__PURE__ */ React.createElement("div", { className: "sidebar-user-card" }, /* @__PURE__ */ React.createElement("div", { className: "sidebar-user-card-inner" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "sidebar-user-button",
        onClick: () => {
          if (isLoggedIn) {
            toggleUserMenu("sidebar");
          } else {
            handleLogoClick();
          }
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "sidebar-user-initials", "aria-hidden": "true" }, avatarInitials),
      /* @__PURE__ */ React.createElement("div", { className: "sidebar-user-meta" }, /* @__PURE__ */ React.createElement("div", { className: "sidebar-user-name" }, displayName), /* @__PURE__ */ React.createElement("div", { className: "sidebar-user-company" }, displayCompany)),
      isLoggedIn && /* @__PURE__ */ React.createElement(
        "span",
        {
          className: "sidebar-user-chevron" + (showUserMenu && userMenuAnchor === "sidebar" ? " open" : ""),
          "aria-hidden": "true"
        }
      )
    )), isLoggedIn && showUserMenu && userMenuAnchor === "sidebar" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-10", onClick: closeUserMenu }), /* @__PURE__ */ React.createElement("div", { className: "sidebar-user-menu" }, renderUserMenuContent()))), isSuperAdmin() && /* @__PURE__ */ React.createElement("div", { className: "px-4 py-3 border-b border-gray-200" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-semibold text-dark-500 mb-2 uppercase" }, "\u015Eirket Se\xE7imi"), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-dark-900 font-medium hover:bg-gray-50 transition-colors flex items-center justify-between",
        onClick: () => setShowCompanyDropdown(!showCompanyDropdown)
      },
      /* @__PURE__ */ React.createElement("span", { className: "truncate" }, selectedCompany === "all" ? "\u{1F310} T\xFCm \u015Eirketler" : ((_b = companies.find((c) => (c._supabaseId || c.id) === selectedCompany)) == null ? void 0 : _b.name) || "\u015Eirket Se\xE7"),
      /* @__PURE__ */ React.createElement("svg", { className: `w-4 h-4 transition-transform ${showCompanyDropdown ? "rotate-180" : ""}`, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }))
    ), showCompanyDropdown && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-10", onClick: () => setShowCompanyDropdown(false) }), /* @__PURE__ */ React.createElement("div", { className: "absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: `w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${selectedCompany === "all" ? "bg-primary-50 text-primary-600 font-semibold" : "text-dark-900"}`,
        onClick: () => handleCompanyChange("all")
      },
      "\u{1F310} T\xFCm \u015Eirketler"
    ), companies.map((company) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: company.id,
        type: "button",
        className: `w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors border-t border-gray-100 ${selectedCompany === (company._supabaseId || company.id) ? "bg-primary-50 text-primary-600 font-semibold" : "text-dark-900"}`,
        onClick: () => handleCompanyChange(company._supabaseId || company.id)
      },
      "\u{1F3E2} ",
      company.name
    )), companies.length === 0 && !companiesLoading && /* @__PURE__ */ React.createElement("div", { className: "px-3 py-2 text-sm text-dark-400 text-center" }, "Hen\xFCz \u015Firket yok"), companiesLoading && /* @__PURE__ */ React.createElement("div", { className: "px-3 py-2 text-sm text-dark-400 text-center" }, "Y\xFCkleniyor..."))))), /* @__PURE__ */ React.createElement("nav", { className: "py-4" }, isSuperAdmin() && /* @__PURE__ */ React.createElement("a", { href: "#/company-management", className: isActive("/company-management") ? "active" : "" }, /* @__PURE__ */ React.createElement(BuildingOfficeIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "\u015Eirket Y\xF6netimi")), ((currentUser == null ? void 0 : currentUser.role) === "admin" || (currentUser == null ? void 0 : currentUser.role) === "SuperAdmin" || isSuperAdmin()) && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("a", { href: "#/dashboard", className: isActive("/dashboard") ? "active" : "" }, /* @__PURE__ */ React.createElement(ChartBarIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Ana Sayfa")), /* @__PURE__ */ React.createElement("a", { href: "#/admin", className: isActive("/admin") ? "active" : "" }, /* @__PURE__ */ React.createElement(CogIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Soru Havuzu")), /* @__PURE__ */ React.createElement("a", { href: "#/questions", className: isActive("/questions") ? "active" : "" }, /* @__PURE__ */ React.createElement(QuestionMarkCircleIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Sorular")), /* @__PURE__ */ React.createElement("a", { href: "#/manager", className: isActive("/manager") ? "active" : "" }, /* @__PURE__ */ React.createElement(ClipboardIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Y\xF6netici Paneli")), /* @__PURE__ */ React.createElement("a", { href: "#/tests", className: isActive("/tests") ? "active" : "" }, /* @__PURE__ */ React.createElement(DocumentTextIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Testler")), /* @__PURE__ */ React.createElement("a", { href: "#/suggest", className: isActive("/suggest") ? "active" : "" }, /* @__PURE__ */ React.createElement(LightBulbIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Soru \xD6ner")), /* @__PURE__ */ React.createElement("a", { href: "#/suggestions", className: isActive("/suggestions") ? "active" : "", style: { position: "relative" } }, /* @__PURE__ */ React.createElement(InformationCircleIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Soru \xD6nerileri"), pendingSuggestions > 0 && /* @__PURE__ */ React.createElement("span", { style: {
      position: "absolute",
      right: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      backgroundColor: "#FF6B4A",
      color: "white",
      borderRadius: "12px",
      padding: "2px 8px",
      fontSize: "12px",
      fontWeight: "bold",
      minWidth: "20px",
      textAlign: "center"
    } }, pendingSuggestions)), /* @__PURE__ */ React.createElement("a", { href: "#/branding", className: isActive("/branding") ? "active" : "" }, /* @__PURE__ */ React.createElement(SparklesIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Marka Ayarlar\u0131")), /* @__PURE__ */ React.createElement("a", { href: "#/users", className: isActive("/users") ? "active" : "" }, /* @__PURE__ */ React.createElement(UsersIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Kullan\u0131c\u0131 Y\xF6netimi"))), (currentUser == null ? void 0 : currentUser.role) === "manager" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("a", { href: "#/dashboard", className: isActive("/dashboard") ? "active" : "" }, /* @__PURE__ */ React.createElement(ChartBarIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Ana Sayfa")), /* @__PURE__ */ React.createElement("a", { href: "#/manager", className: isActive("/manager") ? "active" : "" }, /* @__PURE__ */ React.createElement(ClipboardIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Y\xF6netici Paneli")), /* @__PURE__ */ React.createElement("a", { href: "#/questions", className: isActive("/questions") ? "active" : "" }, /* @__PURE__ */ React.createElement(QuestionMarkCircleIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Sorular")), /* @__PURE__ */ React.createElement("a", { href: "#/tests", className: isActive("/tests") ? "active" : "" }, /* @__PURE__ */ React.createElement(DocumentTextIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Testler")), /* @__PURE__ */ React.createElement("a", { href: "#/suggest", className: isActive("/suggest") ? "active" : "" }, /* @__PURE__ */ React.createElement(LightBulbIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Soru \xD6ner"))), (currentUser == null ? void 0 : currentUser.role) === "tester" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("a", { href: "#/tests", className: isActive("/tests") ? "active" : "" }, /* @__PURE__ */ React.createElement(DocumentTextIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Testler")), /* @__PURE__ */ React.createElement("a", { href: "#/suggest", className: isActive("/suggest") ? "active" : "" }, /* @__PURE__ */ React.createElement(LightBulbIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Soru \xD6ner"))), !isLoggedIn && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("a", { href: "#/mytests", className: isActive("/mytests") ? "active" : "" }, /* @__PURE__ */ React.createElement(DocumentTextIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Testlerim")), /* @__PURE__ */ React.createElement("a", { href: "#/suggest", className: isActive("/suggest") ? "active" : "" }, /* @__PURE__ */ React.createElement(LightBulbIcon, { size: 20, strokeWidth: 2 }), /* @__PURE__ */ React.createElement("span", null, "Soru \xD6ner"))))), !hideSidebar && /* @__PURE__ */ React.createElement("header", { className: "fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto px-4 py-4 relative flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "header-edge-left" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "hamburger " + (open ? "open" : ""),
        onClick: () => setOpen((v) => !v)
      },
      /* @__PURE__ */ React.createElement("span", null),
      /* @__PURE__ */ React.createElement("span", null),
      /* @__PURE__ */ React.createElement("span", null)
    )), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "header-logo",
        onClick: handleLogoClick
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center cursor-pointer hover:opacity-80 transition-opacity" }, /* @__PURE__ */ React.createElement("img", { src: "assets/logo.svg", alt: "QuizUp+", style: { width: "180px", height: "auto" } }))
    ), /* @__PURE__ */ React.createElement("div", { className: "header-actions" }, /* @__PURE__ */ React.createElement("div", { className: "header-user-placeholder" }), /* @__PURE__ */ React.createElement("div", { id: "header-timer-slot", className: "header-timer-slot", "aria-live": "polite" })))), showSignOutAllModal && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "overlay open", onClick: closeSignOutAllModal, style: { zIndex: 998 } }), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "modal-sm open",
        style: {
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 999,
          background: "white",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxWidth: "420px",
          width: "90%"
        }
      },
      /* @__PURE__ */ React.createElement("form", { onSubmit: handleSignOutAllDevices, className: "space-y-5" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-xl font-semibold text-dark-900 mb-2" }, "\u{1F510} T\xFCm Cihazlarda Oturumu Kapat"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-600" }, "Bu i\u015Flem t\xFCm cihazlar\u0131n\u0131zdaki oturumlar\u0131 sonland\u0131r\u0131r. Devam etmek i\xE7in uygulama PIN'inizi do\u011Frulay\u0131n.")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Uygulama PIN (4 Hane)"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "password",
          className: "field",
          inputMode: "numeric",
          maxLength: 4,
          value: signOutAllPin,
          onChange: (e) => {
            setSignOutAllPin(e.target.value);
            setSignOutAllError("");
          },
          autoFocus: true
        }
      ), signOutAllError && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-red-500 mt-2" }, signOutAllError)), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "submit",
          className: "btn btn-primary w-full",
          style: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
          disabled: signingOutAll
        },
        signingOutAll ? "Oturumlar kapat\u0131l\u0131yor..." : "T\xFCm Oturumlar\u0131 Kapat"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "btn btn-ghost w-full",
          onClick: closeSignOutAllModal,
          disabled: signingOutAll
        },
        "Vazge\xE7"
      )))
    )), showUserInfoModal && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "overlay open", onClick: closeUserInfoModal, style: { zIndex: 998 } }), /* @__PURE__ */ React.createElement(
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
          maxWidth: "600px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto"
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-dark-900" }, "\u{1F464} Kullan\u0131c\u0131 Bilgileri"), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "text-dark-400 hover:text-dark-900 text-2xl",
          onClick: closeUserInfoModal
        },
        "\xD7"
      )),
      userInfoLoading ? /* @__PURE__ */ React.createElement(LoadingSpinner, { text: "Bilgiler y\xFCkleniyor..." }) : /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("form", { onSubmit: handleUserInfoSave, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "\u0130sim *"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          className: "field",
          value: userInfoForm.firstName,
          onChange: (e) => setUserInfoForm({ ...userInfoForm, firstName: e.target.value })
        }
      )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Soyisim *"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          className: "field",
          value: userInfoForm.lastName,
          onChange: (e) => setUserInfoForm({ ...userInfoForm, lastName: e.target.value })
        }
      ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "\u015Eirket"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          className: "field",
          value: userInfoForm.company,
          onChange: (e) => setUserInfoForm({ ...userInfoForm, company: e.target.value })
        }
      )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Birim"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          className: "field",
          value: userInfoForm.department,
          onChange: (e) => setUserInfoForm({ ...userInfoForm, department: e.target.value })
        }
      ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "G\xF6rev"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          className: "field",
          value: userInfoForm.position,
          onChange: (e) => setUserInfoForm({ ...userInfoForm, position: e.target.value })
        }
      )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Uygulama PIN (4 Hane)"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          className: "field",
          inputMode: "numeric",
          maxLength: 4,
          value: userInfoForm.applicationPin,
          onChange: (e) => setUserInfoForm({ ...userInfoForm, applicationPin: e.target.value })
        }
      ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dark-500 mt-1" }, "PIN yaln\u0131zca rakamlardan olu\u015Fmal\u0131d\u0131r.")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-4" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "btn btn-ghost flex-1",
          onClick: closeUserInfoModal
        },
        "\u0130ptal"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "submit",
          className: "btn btn-primary flex-1",
          disabled: savingUserInfo
        },
        savingUserInfo ? "Kaydediliyor..." : "Bilgileri Kaydet"
      ))), /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-200 pt-4" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-dark-900 mb-3" }, "\u015Eifre De\u011Fi\u015Ftir"), /* @__PURE__ */ React.createElement("form", { onSubmit: handlePasswordChange, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Mevcut \u015Eifre"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "password",
          className: "field",
          value: passwordForm.current,
          onChange: (e) => setPasswordForm({ ...passwordForm, current: e.target.value }),
          autoComplete: "current-password"
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Yeni \u015Eifre"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "password",
          className: "field",
          value: passwordForm.new,
          onChange: (e) => setPasswordForm({ ...passwordForm, new: e.target.value }),
          autoComplete: "new-password"
        }
      )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Yeni \u015Eifre (Tekrar)"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "password",
          className: "field",
          value: passwordForm.confirm,
          onChange: (e) => setPasswordForm({ ...passwordForm, confirm: e.target.value }),
          autoComplete: "new-password"
        }
      ))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "btn btn-ghost flex-1",
          onClick: () => setPasswordForm({ current: "", new: "", confirm: "" }),
          disabled: changingPassword
        },
        "Temizle"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "submit",
          className: "btn btn-primary flex-1",
          disabled: changingPassword
        },
        changingPassword ? "G\xFCncelleniyor..." : "\u015Eifreyi G\xFCncelle"
      )))))
    )));
  };
  window.Sidebar = Sidebar;
})();
