const { useState, useEffect } = React;

const CompanyManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    plan: 'basic',
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
      await waitFirebase();
      const { db, collection, getDocs, query, orderBy } = window.firebase;

      const q = query(collection(db, 'companies'), orderBy('name'));
      const snapshot = await getDocs(q);
      const companiesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setCompanies(companiesList);

      // Load stats for each company
      await loadStats(companiesList);
    } catch (e) {
      window.devError('Load companies error:', e);
      toast('Şirketler yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (companiesList) => {
    try {
      await waitFirebase();
      const { db, collection, getDocs, query, where, or } = window.firebase;

      const statsMap = {};

      for (const company of companiesList) {
        // Try both ID and name for backward compatibility
        // Some collections might use document ID, others might use company name
        const companyIdentifiers = [company.id];
        if (company.name && company.name !== company.id) {
          companyIdentifiers.push(company.name);
        }

        // Count users - check both ID and name
        const usersQuery = query(
          collection(db, 'users'),
          where('company', 'in', companyIdentifiers)
        );
        const usersSnapshot = await getDocs(usersQuery);

        // Count quiz sessions
        const sessionsQuery = query(
          collection(db, 'quizSessions'),
          where('company', 'in', companyIdentifiers)
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);

        // Count questions
        const questionsQuery = query(
          collection(db, 'questions'),
          where('company', 'in', companyIdentifiers)
        );
        const questionsSnapshot = await getDocs(questionsQuery);

        statsMap[company.id] = {
          users: usersSnapshot.size,
          sessions: sessionsSnapshot.size,
          questions: questionsSnapshot.size
        };
      }

      setStats(statsMap);
    } catch (e) {
      window.devError('Load stats error:', e);
    }
  };

  const openAddModal = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      plan: 'basic',
      maxUsers: 50,
      active: true
    });
    setShowModal(true);
  };

  const openEditModal = (company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || '',
      plan: company.plan || 'basic',
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
      toast('Şirket adı gereklidir', 'error');
      return;
    }

    setSaving(true);
    try {
      await waitFirebase();
      const { db, collection, doc, setDoc, updateDoc, serverTimestamp } = window.firebase;

      if (editingCompany) {
        // Update existing company
        await updateDoc(doc(db, 'companies', editingCompany.id), {
          name: formData.name.trim(),
          plan: formData.plan,
          maxUsers: parseInt(formData.maxUsers) || 50,
          active: formData.active,
          updatedAt: serverTimestamp()
        });
        toast('Şirket güncellendi', 'success');
      } else {
        // Create new company
        const newCompanyRef = doc(collection(db, 'companies'));
        await setDoc(newCompanyRef, {
          name: formData.name.trim(),
          plan: formData.plan,
          maxUsers: parseInt(formData.maxUsers) || 50,
          active: formData.active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast('Şirket oluşturuldu', 'success');
      }

      closeModal();
      loadCompanies();
    } catch (e) {
      window.devError('Save company error:', e);
      toast('Şirket kaydedilemedi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (company) => {
    if (!confirm(`"${company.name}" şirketini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }

    try {
      await waitFirebase();
      const { db, doc, deleteDoc } = window.firebase;

      await deleteDoc(doc(db, 'companies', company.id));
      toast('Şirket silindi', 'success');
      loadCompanies();
    } catch (e) {
      window.devError('Delete company error:', e);
      toast('Şirket silinemedi', 'error');
    }
  };

  const getPlanBadge = (plan) => {
    const badges = {
      free: { label: 'Ücretsiz', color: 'bg-gray-100 text-gray-700' },
      basic: { label: 'Temel', color: 'bg-blue-100 text-blue-700' },
      premium: { label: 'Premium', color: 'bg-purple-100 text-purple-700' }
    };
    const badge = badges[plan] || badges.basic;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <Page
      title="Şirket Yönetimi"
      subtitle="Tüm şirketleri görüntüleyin ve yönetin"
      extra={
        <button
          className="btn btn-primary"
          onClick={openAddModal}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Şirket Ekle
        </button>
      }
    >
      {loading ? (
        <LoadingSpinner text="Şirketler yükleniyor..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map(company => (
            <div key={company.id} className="bg-white rounded-xl shadow-card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-dark-900 mb-1">{company.name}</h3>
                  <div className="flex items-center gap-2">
                    {getPlanBadge(company.plan)}
                    {company.active === false && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        Pasif
                      </span>
                    )}
                  </div>
                </div>
                <BuildingOfficeIcon size={24} className="text-primary-500" />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500">Kullanıcı Sayısı</span>
                  <span className="font-semibold text-dark-900">{stats[company.id]?.users || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500">Test Sayısı</span>
                  <span className="font-semibold text-dark-900">{stats[company.id]?.sessions || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500">Soru Sayısı</span>
                  <span className="font-semibold text-dark-900">{stats[company.id]?.questions || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500">Max Kullanıcı</span>
                  <span className="font-semibold text-dark-900">{company.maxUsers || 50}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="btn btn-secondary flex-1 text-sm py-2"
                  onClick={() => openEditModal(company)}
                >
                  Düzenle
                </button>
                <button
                  className="btn btn-ghost text-sm py-2 px-3 text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(company)}
                >
                  Sil
                </button>
              </div>
            </div>
          ))}

          {companies.length === 0 && (
            <div className="col-span-full text-center py-12">
              <BuildingOfficeIcon size={48} className="mx-auto text-dark-300 mb-4" />
              <p className="text-dark-500 mb-4">Henüz şirket eklenmemiş</p>
              <button className="btn btn-primary" onClick={openAddModal}>
                İlk Şirketi Ekle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <>
          <div className="overlay open" onClick={closeModal} style={{ zIndex: 998 }}></div>
          <div
            className="modal-sm open"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 999,
              background: 'white',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              maxWidth: '500px',
              width: '90%'
            }}
          >
            <h2 className="text-2xl font-bold text-dark-900 mb-6">
              {editingCompany ? 'Şirketi Düzenle' : 'Yeni Şirket Ekle'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">
                  Şirket Adı *
                </label>
                <input
                  type="text"
                  className="field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: BLUEMINT"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">
                  Plan
                </label>
                <select
                  className="field"
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                >
                  <option value="free">Ücretsiz</option>
                  <option value="basic">Temel</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">
                  Maksimum Kullanıcı Sayısı
                </label>
                <input
                  type="number"
                  className="field"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                  min="1"
                  max="10000"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="active" className="text-sm font-medium text-dark-700">
                  Aktif
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={closeModal}
                  disabled={saving}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={saving}
                >
                  {saving ? 'Kaydediliyor...' : (editingCompany ? 'Güncelle' : 'Ekle')}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </Page>
  );
};

window.CompanyManagement = CompanyManagement;
