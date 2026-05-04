(() => {
  const { useState, useEffect } = React;
  const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      // Temporary password for Supabase Auth only
      role: "manager",
      position: "",
      company: "",
      department: "",
      applicationPin: ""
    });
    const [editForm, setEditForm] = useState({
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      position: "",
      company: "",
      department: "",
      applicationPin: ""
    });
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
      if (!requireAuth("admin")) return;
    }, []);
    useEffect(() => {
      loadUsers();
      const handleCompanyChange = () => {
        setLoading(true);
        loadUsers();
      };
      window.addEventListener("company-changed", handleCompanyChange);
      return () => window.removeEventListener("company-changed", handleCompanyChange);
    }, []);
    const loadUsers = async () => {
      try {
        const user = getCurrentUser();
        if (!user || user.role !== "admin" && user.role !== "SuperAdmin" && !user.isSuperAdmin) {
          toast("Yetkiniz yok", "error");
          setLoading(false);
          return;
        }
        const isSuperAdminUser = user.isSuperAdmin === true;
        let companyId = null;
        if (isSuperAdminUser) {
          try {
            const sel = JSON.parse(localStorage.getItem("superadmin:selectedCompanyData") || "null");
            if ((sel == null ? void 0 : sel.id) && sel.id !== "all") companyId = sel.id;
          } catch {
            companyId = null;
          }
        } else {
          companyId = user.companyId || null;
          if (!companyId) {
            setUsers([]);
            setLoading(false);
            return;
          }
        }
        const profiles = await window.db.getProfiles({ companyId, all: isSuperAdminUser && !companyId });
        setUsers(profiles);
      } catch (e) {
        window.devError("Load users error:", e);
        toast("Kullan\u0131c\u0131lar y\xFCklenemedi: " + e.message, "error");
      } finally {
        setLoading(false);
      }
    };
    const handleSubmit = async (e) => {
      var _a, _b, _c;
      e.preventDefault();
      if (!form.firstName || !form.lastName || !form.email || !form.password) {
        toast("L\xFCtfen t\xFCm alanlar\u0131 doldurun", "error");
        return;
      }
      if (form.password.length < 6) {
        toast("\u015Eifre en az 6 karakter olmal\u0131d\u0131r", "error");
        return;
      }
      if (!form.applicationPin || !/^\d{4}$/.test(form.applicationPin.trim())) {
        toast("Uygulama PIN'i 4 haneli olmal\u0131d\u0131r", "error");
        return;
      }
      const normalizedEmail = form.email.trim().toLowerCase();
      const applicationPin = form.applicationPin.trim();
      setSubmitting(true);
      try {
        const adminUser = getCurrentUser();
        const isAdmin = (adminUser == null ? void 0 : adminUser.role) === "admin";
        const isSuperAdmin = (adminUser == null ? void 0 : adminUser.isSuperAdmin) === true;
        if (!adminUser || !isAdmin && !isSuperAdmin) {
          throw Object.assign(new Error("Y\xF6netici oturumu bulunamad\u0131"), { code: "auth/admin-required" });
        }
        let companyId;
        if (isSuperAdmin) {
          try {
            const sel = JSON.parse(localStorage.getItem("superadmin:selectedCompanyData") || "null");
            if ((sel == null ? void 0 : sel.id) && sel.id !== "all") {
              companyId = sel.id;
            } else {
              throw new Error("L\xFCtfen sidebar'dan bir \u015Firket se\xE7in");
            }
          } catch (e2) {
            throw new Error("L\xFCtfen sidebar'dan bir \u015Firket se\xE7in");
          }
        } else {
          companyId = adminUser.companyId || null;
          if (!companyId) throw new Error("\u015Eirket bilgisi bulunamad\u0131");
        }
        await window.db.createUser({
          email: normalizedEmail,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          companyId,
          position: form.position || null,
          department: ((_a = form.department) == null ? void 0 : _a.trim()) || null,
          applicationPin,
          createdBy: adminUser.uid
        });
        toast("Kullan\u0131c\u0131 ba\u015Far\u0131yla olu\u015Fturuldu", "success");
        setShowModal(false);
        setForm({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          role: "manager",
          position: "",
          company: "",
          department: "",
          applicationPin: ""
        });
        loadUsers();
      } catch (error) {
        window.devError("Create user error:", error);
        if (((_b = error.message) == null ? void 0 : _b.includes("User already registered")) || ((_c = error.message) == null ? void 0 : _c.includes("already been registered"))) {
          toast("Bu email adresi zaten kullan\u0131l\u0131yor", "error");
        } else if (error.code === "auth/admin-required") {
          toast("Y\xF6netici oturumunuz bulunamad\u0131. L\xFCtfen tekrar giri\u015F yap\u0131n.", "error");
        } else {
          toast((error == null ? void 0 : error.message) ? `Kullan\u0131c\u0131 olu\u015Fturulurken hata olu\u015Ftu: ${error.message}` : "Kullan\u0131c\u0131 olu\u015Fturulurken hata olu\u015Ftu", "error");
        }
      } finally {
        setSubmitting(false);
      }
    };
    const openEditModal = (user) => {
      setEditingUser(user);
      setEditForm({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        position: user.position || "",
        company: user.companyName || user.company || "",
        department: user.department || "",
        applicationPin: user.applicationPin || ""
      });
      setShowEditModal(true);
    };
    const handleEditSubmit = async (e) => {
      var _a;
      e.preventDefault();
      if (!editForm.firstName || !editForm.lastName || !editForm.email) {
        toast("L\xFCtfen t\xFCm zorunlu alanlar\u0131 doldurun", "error");
        return;
      }
      if (!editForm.applicationPin || !/^\d{4}$/.test(editForm.applicationPin.trim())) {
        toast("Uygulama PIN'i 4 haneli olmal\u0131d\u0131r", "error");
        return;
      }
      setSubmitting(true);
      try {
        const applicationPin = editForm.applicationPin.trim();
        await window.db.updateProfile(editingUser.uid || editingUser.id, {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          role: editForm.role,
          position: editForm.position || null,
          department: ((_a = editForm.department) == null ? void 0 : _a.trim()) || null,
          applicationPin
        });
        toast("Kullan\u0131c\u0131 ba\u015Far\u0131yla g\xFCncellendi", "success");
        setShowEditModal(false);
        setEditingUser(null);
        loadUsers();
      } catch (error) {
        window.devError("Update user error:", error);
        toast("Kullan\u0131c\u0131 g\xFCncellenirken hata olu\u015Ftu", "error");
      } finally {
        setSubmitting(false);
      }
    };
    const sendPasswordReset = async (userEmail, userName) => {
      if (!confirm(`${userName} (${userEmail}) adresine \u015Fifre s\u0131f\u0131rlama maili g\xF6ndermek istedi\u011Finize emin misiniz?`)) return;
      try {
        await window.db.resetPasswordForEmail(userEmail);
        toast("\u015Eifre s\u0131f\u0131rlama maili ba\u015Far\u0131yla g\xF6nderildi", "success");
      } catch (error) {
        window.devError("Password reset error:", error);
        toast("\u015Eifre s\u0131f\u0131rlama maili g\xF6nderilemedi: " + (error.message || "Bilinmeyen hata"), "error");
      }
    };
    const deleteUser = async (userId, userEmail) => {
      if (!confirm(`${userEmail} kullan\u0131c\u0131s\u0131n\u0131 silmek istedi\u011Finize emin misiniz?

Bu i\u015Flem Auth ve profilden tamamen silecek.`)) return;
      try {
        await window.db.deleteProfile(userId);
        toast("Kullan\u0131c\u0131 silindi", "success");
        loadUsers();
      } catch (e) {
        window.devError("Delete user error:", e);
        toast(e.message || "Kullan\u0131c\u0131 silinirken hata olu\u015Ftu", "error");
      }
    };
    const getRoleBadge = (role) => {
      if (role === "admin") return /* @__PURE__ */ React.createElement("span", { className: "chip bg-red-100 text-red-700 inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(TrophyIcon, { size: 14, strokeWidth: 2 }), " Admin");
      if (role === "manager") return /* @__PURE__ */ React.createElement("span", { className: "chip bg-blue-100 text-blue-700 inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(UserIcon, { size: 14, strokeWidth: 2 }), " Y\xF6netici");
      if (role === "tester") return /* @__PURE__ */ React.createElement("span", { className: "chip bg-green-100 text-green-700 inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(PencilSquareIcon, { size: 14, strokeWidth: 2 }), " Test Kullan\u0131c\u0131s\u0131");
      return /* @__PURE__ */ React.createElement("span", { className: "chip" }, role);
    };
    if (loading) return /* @__PURE__ */ React.createElement(Page, { title: "Kullan\u0131c\u0131 Y\xF6netimi" }, /* @__PURE__ */ React.createElement(LoadingSpinner, null));
    return /* @__PURE__ */ React.createElement(
      Page,
      {
        title: "Kullan\u0131c\u0131 Y\xF6netimi",
        subtitle: `Toplam ${users.length} kullan\u0131c\u0131`,
        extra: /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => setShowModal(true) }, /* @__PURE__ */ React.createElement(PlusIcon, { size: 16, strokeWidth: 2, className: "inline" }), " Yeni Kullan\u0131c\u0131")
      },
      users.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "card p-8 text-center text-dark-500" }, /* @__PURE__ */ React.createElement("div", { className: "text-6xl mb-4" }, "\u{1F465}"), /* @__PURE__ */ React.createElement("p", null, "Hen\xFCz kullan\u0131c\u0131 eklenmemi\u015F.")) : /* @__PURE__ */ React.createElement("div", { className: "card overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase" }, "\u0130sim"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase" }, "Email"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase" }, "\u015Eirket"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase" }, "Birim"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase" }, "Rol"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase" }, "G\xF6rev"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase" }, "Uygulama PIN"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase" }, "Olu\u015Fturulma"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-right text-xs font-semibold text-dark-700 uppercase" }, "\u0130\u015Flem"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-gray-200" }, users.map((user) => /* @__PURE__ */ React.createElement("tr", { key: user.id, className: "hover:bg-gray-50 transition-colors" }, /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-dark-900" }, user.firstName, " ", user.lastName)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-sm text-dark-600" }, user.email), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-sm text-dark-600" }, user.companyName || user.company || "-"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-sm text-dark-600" }, user.department || "-"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4" }, getRoleBadge(user.role)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-sm text-dark-600" }, user.position || "-"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-sm font-mono text-dark-900" }, user.applicationPin || "Belirlenmedi"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-sm text-dark-500" }, fmtDate(user.createdAt)), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-right" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 justify-end" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "text-blue-600 hover:text-blue-800 font-semibold text-sm",
          onClick: () => openEditModal(user)
        },
        /* @__PURE__ */ React.createElement(PencilSquareIcon, { size: 14, strokeWidth: 2, className: "inline" }),
        " D\xFCzenle"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "text-orange-600 hover:text-orange-800 font-semibold text-sm",
          onClick: () => sendPasswordReset(user.email, `${user.firstName} ${user.lastName}`),
          title: "\u015Eifre s\u0131f\u0131rlama maili g\xF6nder"
        },
        "\u{1F511} \u015Eifre S\u0131f\u0131rla"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "text-red-600 hover:text-red-800 font-semibold text-sm",
          onClick: () => deleteUser(user.id, user.email)
        },
        /* @__PURE__ */ React.createElement(TrashIcon, { size: 14, strokeWidth: 2, className: "inline" }),
        " Sil"
      ))))))))),
      showModal && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "overlay open", onClick: () => setShowModal(false), style: { zIndex: 998 } }), /* @__PURE__ */ React.createElement(
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
        /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "headline-small text-dark-900 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(PlusIcon, { size: 24, strokeWidth: 2 }), " Yeni Kullan\u0131c\u0131 Ekle"), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "text-dark-400 hover:text-dark-900 text-2xl",
            onClick: () => setShowModal(false)
          },
          "\xD7"
        )),
        /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "\u0130sim *"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            placeholder: "Ahmet",
            value: form.firstName,
            onChange: (e) => setForm({ ...form, firstName: e.target.value })
          }
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Soyisim *"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            placeholder: "Y\u0131lmaz",
            value: form.lastName,
            onChange: (e) => setForm({ ...form, lastName: e.target.value })
          }
        ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Email *"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "email",
            className: "field",
            placeholder: "ahmet@example.com",
            value: form.email,
            onChange: (e) => setForm({ ...form, email: e.target.value })
          }
        )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "\u015Eirket"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            value: form.company,
            onChange: (e) => setForm({ ...form, company: e.target.value })
          }
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Birim"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            value: form.department,
            onChange: (e) => setForm({ ...form, department: e.target.value })
          }
        ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "\u015Eifre *"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "password",
            className: "field",
            placeholder: "En az 6 karakter",
            value: form.password,
            onChange: (e) => setForm({ ...form, password: e.target.value })
          }
        ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dark-500 mt-1" }, "\u015Eifre sadece Supabase Auth taraf\u0131nda saklan\u0131r.")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Rol *"), /* @__PURE__ */ React.createElement(
          "select",
          {
            className: "field",
            value: form.role,
            onChange: (e) => setForm({ ...form, role: e.target.value })
          },
          /* @__PURE__ */ React.createElement("option", { value: "manager" }, "Y\xF6netici"),
          /* @__PURE__ */ React.createElement("option", { value: "tester" }, "Test Kullan\u0131c\u0131s\u0131"),
          /* @__PURE__ */ React.createElement("option", { value: "admin" }, "Admin")
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "G\xF6rev (\u0130ste\u011Fe Ba\u011Fl\u0131)"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            placeholder: "\xD6rn: Ma\u011Faza M\xFCd\xFCr\xFC",
            value: form.position,
            onChange: (e) => setForm({ ...form, position: e.target.value })
          }
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Uygulama PIN (4 Hane)"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            placeholder: "4 haneli PIN",
            inputMode: "numeric",
            value: form.applicationPin,
            onChange: (e) => setForm({ ...form, applicationPin: e.target.value }),
            maxLength: 4
          }
        ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dark-500 mt-1" }, "PIN zorunludur; varsay\u0131lan PIN atanmaz.")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-4" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "btn btn-ghost flex-1",
            onClick: () => setShowModal(false)
          },
          "\u0130ptal"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "submit",
            className: "btn btn-primary flex-1",
            disabled: submitting
          },
          submitting ? "Olu\u015Fturuluyor..." : "Kullan\u0131c\u0131 Olu\u015Ftur"
        )))
      )),
      showEditModal && editingUser && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "overlay open", onClick: () => setShowEditModal(false), style: { zIndex: 998 } }), /* @__PURE__ */ React.createElement(
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
        /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "headline-small text-dark-900 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(PencilSquareIcon, { size: 24, strokeWidth: 2 }), " Kullan\u0131c\u0131 D\xFCzenle"), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "text-dark-400 hover:text-dark-900 text-2xl",
            onClick: () => setShowEditModal(false)
          },
          "\xD7"
        )),
        /* @__PURE__ */ React.createElement("form", { onSubmit: handleEditSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "\u0130sim *"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            value: editForm.firstName,
            onChange: (e) => setEditForm({ ...editForm, firstName: e.target.value })
          }
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Soyisim *"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            value: editForm.lastName,
            onChange: (e) => setEditForm({ ...editForm, lastName: e.target.value })
          }
        ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Email *"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "email",
            className: "field",
            value: editForm.email,
            onChange: (e) => setEditForm({ ...editForm, email: e.target.value })
          }
        )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "\u015Eirket"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            value: editForm.company,
            onChange: (e) => setEditForm({ ...editForm, company: e.target.value })
          }
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Birim"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            value: editForm.department,
            onChange: (e) => setEditForm({ ...editForm, department: e.target.value })
          }
        ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Rol *"), /* @__PURE__ */ React.createElement(
          "select",
          {
            className: "field",
            value: editForm.role,
            onChange: (e) => setEditForm({ ...editForm, role: e.target.value })
          },
          /* @__PURE__ */ React.createElement("option", { value: "manager" }, "Y\xF6netici"),
          /* @__PURE__ */ React.createElement("option", { value: "tester" }, "Test Kullan\u0131c\u0131s\u0131"),
          /* @__PURE__ */ React.createElement("option", { value: "admin" }, "Admin")
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "G\xF6rev (\u0130ste\u011Fe Ba\u011Fl\u0131)"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            value: editForm.position,
            onChange: (e) => setEditForm({ ...editForm, position: e.target.value })
          }
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Uygulama PIN (4 Hane)"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            inputMode: "numeric",
            value: editForm.applicationPin,
            onChange: (e) => setEditForm({ ...editForm, applicationPin: e.target.value }),
            maxLength: 4
          }
        )), /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800" }, /* @__PURE__ */ React.createElement("strong", { className: "inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement(LightBulbIcon, { size: 16, strokeWidth: 2 }), " Not:"), ' \u015Eifre de\u011Fi\u015Ftirmek i\xE7in tablodaki "G\xF6ster" butonunu kullan\u0131n.'), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-4" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "btn btn-ghost flex-1",
            onClick: () => setShowEditModal(false)
          },
          "\u0130ptal"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "submit",
            className: "btn btn-primary flex-1",
            disabled: submitting
          },
          submitting ? "G\xFCncelleniyor..." : "Kullan\u0131c\u0131y\u0131 G\xFCncelle"
        )))
      ))
    );
  };
  window.UserManagement = UserManagement;
})();
