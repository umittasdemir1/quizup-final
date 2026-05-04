(() => {
  const { useState, useEffect } = React;
  const CompanyManagement = () => {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [formData, setFormData] = useState({
      name: "",
      plan: "basic",
      maxUsers: 50,
      active: true
    });
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState({});
    useEffect(() => {
      loadCompanies();
    }, []);
    const loadCompanies = async () => {
      setLoading(true);
      try {
        const companiesList = await window.db.getCompanies();
        setCompanies(companiesList);
        await loadStats(companiesList);
      } catch (e) {
        window.devError("Load companies error:", e);
        toast("\u015Eirketler y\xFCklenemedi", "error");
      } finally {
        setLoading(false);
      }
    };
    const loadStats = async (companiesList) => {
      try {
        const statsMap = {};
        for (const company of companiesList) {
          const companyId = company._supabaseId || company.id;
          const [users, sessions, questions] = await Promise.all([
            window.db.getProfiles({ companyId }),
            window.db.getSessions(companyId),
            window.db.getQuestions({ companyId })
          ]);
          statsMap[company.id] = {
            users: users.length,
            sessions: sessions.length,
            questions: questions.length
          };
        }
        setStats(statsMap);
      } catch (e) {
        window.devError("Load stats error:", e);
      }
    };
    const openAddModal = () => {
      setEditingCompany(null);
      setFormData({
        name: "",
        plan: "basic",
        maxUsers: 50,
        active: true
      });
      setShowModal(true);
    };
    const openEditModal = (company) => {
      setEditingCompany(company);
      setFormData({
        name: company.name || "",
        plan: company.plan || "basic",
        maxUsers: company.maxUsers || 50,
        active: company.active !== false
      });
      setShowModal(true);
    };
    const closeModal = () => {
      setShowModal(false);
      setEditingCompany(null);
      setSaving(false);
    };
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.name.trim()) {
        toast("\u015Eirket ad\u0131 gereklidir", "error");
        return;
      }
      setSaving(true);
      try {
        if (editingCompany) {
          await window.db.updateCompany(editingCompany._supabaseId || editingCompany.id, {
            name: formData.name.trim(),
            plan: formData.plan,
            maxUsers: parseInt(formData.maxUsers) || 50,
            active: formData.active
          });
          toast("\u015Eirket g\xFCncellendi", "success");
        } else {
          await window.db.addCompany({
            name: formData.name.trim(),
            plan: formData.plan,
            maxUsers: parseInt(formData.maxUsers) || 50,
            active: formData.active
          });
          toast("\u015Eirket olu\u015Fturuldu", "success");
        }
        closeModal();
        loadCompanies();
      } catch (e2) {
        window.devError("Save company error:", e2);
        toast("\u015Eirket kaydedilemedi", "error");
      } finally {
        setSaving(false);
      }
    };
    const handleDelete = async (company) => {
      if (!confirm(`"${company.name}" \u015Firketini silmek istedi\u011Finizden emin misiniz? Bu i\u015Flem geri al\u0131namaz.`)) {
        return;
      }
      try {
        await window.db.deleteCompany(company._supabaseId || company.id);
        toast("\u015Eirket silindi", "success");
        loadCompanies();
      } catch (e) {
        window.devError("Delete company error:", e);
        toast("\u015Eirket silinemedi", "error");
      }
    };
    const getPlanBadge = (plan) => {
      const badges = {
        free: { label: "\xDCcretsiz", color: "bg-gray-100 text-gray-700" },
        basic: { label: "Temel", color: "bg-blue-100 text-blue-700" },
        premium: { label: "Premium", color: "bg-purple-100 text-purple-700" }
      };
      const badge = badges[plan] || badges.basic;
      return /* @__PURE__ */ React.createElement("span", { className: `px-2 py-1 rounded-full text-xs font-semibold ${badge.color}` }, badge.label);
    };
    return /* @__PURE__ */ React.createElement(
      Page,
      {
        title: "\u015Eirket Y\xF6netimi",
        subtitle: "T\xFCm \u015Firketleri g\xF6r\xFCnt\xFCleyin ve y\xF6netin",
        extra: /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-primary",
            onClick: openAddModal
          },
          /* @__PURE__ */ React.createElement("svg", { className: "w-5 h-5 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v16m8-8H4" })),
          "Yeni \u015Eirket Ekle"
        )
      },
      loading ? /* @__PURE__ */ React.createElement(LoadingSpinner, { text: "\u015Eirketler y\xFCkleniyor..." }) : /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" }, companies.map((company) => {
        var _a, _b, _c;
        return /* @__PURE__ */ React.createElement("div", { key: company.id, className: "bg-white rounded-xl shadow-card p-6 hover:shadow-lg transition-shadow" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-dark-900 mb-1" }, company.displayName || company.name), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, company.isDemo && /* @__PURE__ */ React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-semibold bg-secondary-100 text-secondary-700" }, "Demo"), getPlanBadge(company.plan), company.active === false && /* @__PURE__ */ React.createElement("span", { className: "px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700" }, "Pasif"))), /* @__PURE__ */ React.createElement(BuildingOfficeIcon, { size: 24, className: "text-primary-500" })), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "text-dark-500" }, "Kullan\u0131c\u0131 Say\u0131s\u0131"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-dark-900" }, ((_a = stats[company.id]) == null ? void 0 : _a.users) || 0)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "text-dark-500" }, "Test Say\u0131s\u0131"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-dark-900" }, ((_b = stats[company.id]) == null ? void 0 : _b.sessions) || 0)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "text-dark-500" }, "Soru Say\u0131s\u0131"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-dark-900" }, ((_c = stats[company.id]) == null ? void 0 : _c.questions) || 0)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "text-dark-500" }, "Max Kullan\u0131c\u0131"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-dark-900" }, company.maxUsers || 50))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-secondary flex-1 text-sm py-2",
            onClick: () => openEditModal(company)
          },
          "D\xFCzenle"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            className: "btn btn-ghost text-sm py-2 px-3 text-red-600 hover:bg-red-50",
            onClick: () => handleDelete(company)
          },
          "Sil"
        )));
      }), companies.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "col-span-full text-center py-12" }, /* @__PURE__ */ React.createElement(BuildingOfficeIcon, { size: 48, className: "mx-auto text-dark-300 mb-4" }), /* @__PURE__ */ React.createElement("p", { className: "text-dark-500 mb-4" }, "Hen\xFCz \u015Firket eklenmemi\u015F"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: openAddModal }, "\u0130lk \u015Eirketi Ekle"))),
      showModal && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "overlay open", onClick: closeModal, style: { zIndex: 998 } }), /* @__PURE__ */ React.createElement(
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
            maxWidth: "500px",
            width: "90%"
          }
        },
        /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-dark-900 mb-6" }, editingCompany ? "\u015Eirketi D\xFCzenle" : "Yeni \u015Eirket Ekle"),
        /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "\u015Eirket Ad\u0131 *"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            className: "field",
            value: formData.name,
            onChange: (e) => setFormData({ ...formData, name: e.target.value }),
            placeholder: "\xD6rn: BLUEMINT",
            required: true
          }
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Plan"), /* @__PURE__ */ React.createElement(
          "select",
          {
            className: "field",
            value: formData.plan,
            onChange: (e) => setFormData({ ...formData, plan: e.target.value })
          },
          /* @__PURE__ */ React.createElement("option", { value: "free" }, "\xDCcretsiz"),
          /* @__PURE__ */ React.createElement("option", { value: "basic" }, "Temel"),
          /* @__PURE__ */ React.createElement("option", { value: "premium" }, "Premium")
        )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-dark-700 mb-2" }, "Maksimum Kullan\u0131c\u0131 Say\u0131s\u0131"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "number",
            className: "field",
            value: formData.maxUsers,
            onChange: (e) => setFormData({ ...formData, maxUsers: e.target.value }),
            min: "1",
            max: "10000"
          }
        )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "checkbox",
            id: "active",
            checked: formData.active,
            onChange: (e) => setFormData({ ...formData, active: e.target.checked }),
            className: "w-4 h-4 text-primary-600 rounded"
          }
        ), /* @__PURE__ */ React.createElement("label", { htmlFor: "active", className: "text-sm font-medium text-dark-700" }, "Aktif")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-4" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "btn btn-ghost flex-1",
            onClick: closeModal,
            disabled: saving
          },
          "\u0130ptal"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "submit",
            className: "btn btn-primary flex-1",
            disabled: saving
          },
          saving ? "Kaydediliyor..." : editingCompany ? "G\xFCncelle" : "Ekle"
        )))
      ))
    );
  };
  window.CompanyManagement = CompanyManagement;
})();
