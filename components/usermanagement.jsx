const { useState, useEffect } = React;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '', // Temporary password for Supabase Auth only
    role: 'manager',
    position: '',
    company: '',
    department: '',
    applicationPin: ''
  });

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    position: '',
    company: '',
    department: '',
    applicationPin: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Auth check
  useEffect(() => {
    if (!requireAuth('admin')) return;
  }, []);

  useEffect(() => {
    loadUsers();

    // Super admin şirket değiştirdiğinde yeniden yükle
    const handleCompanyChange = () => {
      setLoading(true);
      loadUsers();
    };

    window.addEventListener('company-changed', handleCompanyChange);
    return () => window.removeEventListener('company-changed', handleCompanyChange);
  }, []);

  const loadUsers = async () => {
    try {
      const user = getCurrentUser();
      if (!user || (user.role !== 'admin' && user.role !== 'SuperAdmin' && !user.isSuperAdmin)) {
        toast('Yetkiniz yok', 'error');
        setLoading(false);
        return;
      }

      const isSuperAdminUser = user.isSuperAdmin === true;

      let companyId = null;
      if (isSuperAdminUser) {
        try {
          const sel = JSON.parse(localStorage.getItem('superadmin:selectedCompanyData') || 'null');
          if (sel?.id && sel.id !== 'all') companyId = sel.id;
          // null means all companies
        } catch { companyId = null; }
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
      window.devError('Load users error:', e);
      toast('Kullanıcılar yüklenemedi: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast('Lütfen tüm alanları doldurun', 'error');
      return;
    }

    if (form.password.length < 6) {
      toast('Şifre en az 6 karakter olmalıdır', 'error');
      return;
    }

    if (!form.applicationPin || !/^\d{4}$/.test(form.applicationPin.trim())) {
      toast('Uygulama PIN\'i 4 haneli olmalıdır', 'error');
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    const applicationPin = form.applicationPin.trim();

    setSubmitting(true);
    try {
      const adminUser = getCurrentUser();
      const isAdmin = adminUser?.role === 'admin';
      const isSuperAdmin = adminUser?.isSuperAdmin === true;

      if (!adminUser || (!isAdmin && !isSuperAdmin)) {
        throw Object.assign(new Error('Yönetici oturumu bulunamadı'), { code: 'auth/admin-required' });
      }

      // Company ID resolution
      let companyId;
      if (isSuperAdmin) {
        try {
          const sel = JSON.parse(localStorage.getItem('superadmin:selectedCompanyData') || 'null');
          if (sel?.id && sel.id !== 'all') {
            companyId = sel.id;
          } else {
            throw new Error('Lütfen sidebar\'dan bir şirket seçin');
          }
        } catch (e) {
          throw new Error('Lütfen sidebar\'dan bir şirket seçin');
        }
      } else {
        companyId = adminUser.companyId || null;
        if (!companyId) throw new Error('Şirket bilgisi bulunamadı');
      }

      await window.db.createUser({
        email: normalizedEmail,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        companyId,
        position: form.position || null,
        department: form.department?.trim() || null,
        applicationPin,
        createdBy: adminUser.uid,
      });

      toast('Kullanıcı başarıyla oluşturuldu', 'success');
      setShowModal(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'manager',
        position: '',
        company: '',
        department: '',
        applicationPin: ''
      });
      loadUsers();

    } catch (error) {
      window.devError('Create user error:', error);

      if (error.message?.includes('User already registered') || error.message?.includes('already been registered')) {
        toast('Bu email adresi zaten kullanılıyor', 'error');
      } else if (error.code === 'auth/admin-required') {
        toast('Yönetici oturumunuz bulunamadı. Lütfen tekrar giriş yapın.', 'error');
      } else {
        toast(error?.message ? `Kullanıcı oluşturulurken hata oluştu: ${error.message}` : 'Kullanıcı oluşturulurken hata oluştu', 'error');
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
      position: user.position || '',
      company: user.companyName || user.company || '',
      department: user.department || '',
      applicationPin: user.applicationPin || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editForm.firstName || !editForm.lastName || !editForm.email) {
      toast('Lütfen tüm zorunlu alanları doldurun', 'error');
      return;
    }

    if (!editForm.applicationPin || !/^\d{4}$/.test(editForm.applicationPin.trim())) {
      toast('Uygulama PIN\'i 4 haneli olmalıdır', 'error');
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
        department: editForm.department?.trim() || null,
        applicationPin,
      });

      toast('Kullanıcı başarıyla güncellendi', 'success');
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();

    } catch (error) {
      window.devError('Update user error:', error);
      toast('Kullanıcı güncellenirken hata oluştu', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Passwords are managed solely through Supabase Auth.

  const sendPasswordReset = async (userEmail, userName) => {
    if (!confirm(`${userName} (${userEmail}) adresine şifre sıfırlama maili göndermek istediğinize emin misiniz?`)) return;

    try {
      await window.db.resetPasswordForEmail(userEmail);
      toast('Şifre sıfırlama maili başarıyla gönderildi', 'success');
    } catch (error) {
      window.devError('Password reset error:', error);
      toast('Şifre sıfırlama maili gönderilemedi: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
  };

  const deleteUser = async (userId, userEmail) => {
    if (!confirm(`${userEmail} kullanıcısını silmek istediğinize emin misiniz?\n\nBu işlem Auth ve profilden tamamen silecek.`)) return;

    try {
      await window.db.deleteProfile(userId);
      toast('Kullanıcı silindi', 'success');
      loadUsers();
    } catch (e) {
      window.devError('Delete user error:', e);
      toast(e.message || 'Kullanıcı silinirken hata oluştu', 'error');
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return <span className="chip bg-red-100 text-red-700 inline-flex items-center gap-1"><TrophyIcon size={14} strokeWidth={2} /> Admin</span>;
    if (role === 'manager') return <span className="chip bg-blue-100 text-blue-700 inline-flex items-center gap-1"><UserIcon size={14} strokeWidth={2} /> Yönetici</span>;
    if (role === 'tester') return <span className="chip bg-green-100 text-green-700 inline-flex items-center gap-1"><PencilSquareIcon size={14} strokeWidth={2} /> Test Kullanıcısı</span>;
    return <span className="chip">{role}</span>;
  };

  if (loading) return <Page title="Kullanıcı Yönetimi"><LoadingSpinner /></Page>;

  return (
    <Page
      title="Kullanıcı Yönetimi"
      subtitle={`Toplam ${users.length} kullanıcı`}
      extra={
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusIcon size={16} strokeWidth={2} className="inline" /> Yeni Kullanıcı
        </button>
      }
    >
      {users.length === 0 ? (
        <div className="card p-8 text-center text-dark-500">
          <div className="text-6xl mb-4">👥</div>
          <p>Henüz kullanıcı eklenmemiş.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">İsim</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Şirket</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Birim</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Görev</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Uygulama PIN</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Oluşturulma</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-dark-700 uppercase">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-dark-900">
                        {user.firstName} {user.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-dark-600">{user.companyName || user.company || '-'}</td>
                    <td className="px-6 py-4 text-sm text-dark-600">{user.department || '-'}</td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 text-sm text-dark-600">{user.position || '-'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-dark-900">{user.applicationPin || 'Belirlenmedi'}</td>
                    <td className="px-6 py-4 text-sm text-dark-500">{fmtDate(user.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                          onClick={() => openEditModal(user)}
                        >
                          <PencilSquareIcon size={14} strokeWidth={2} className="inline" /> Düzenle
                        </button>
                        <button
                          className="text-orange-600 hover:text-orange-800 font-semibold text-sm"
                          onClick={() => sendPasswordReset(user.email, `${user.firstName} ${user.lastName}`)}
                          title="Şifre sıfırlama maili gönder"
                        >
                          🔑 Şifre Sıfırla
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 font-semibold text-sm"
                          onClick={() => deleteUser(user.id, user.email)}
                        >
                          <TrashIcon size={14} strokeWidth={2} className="inline" /> Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showModal && (
        <>
          <div className="overlay open" onClick={() => setShowModal(false)} style={{ zIndex: 998 }}></div>
          <div
            className="modal-lg open"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 999,
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="headline-small text-dark-900 flex items-center gap-2"><PlusIcon size={24} strokeWidth={2} /> Yeni Kullanıcı Ekle</h2>
              <button
                className="text-dark-400 hover:text-dark-900 text-2xl"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">İsim *</label>
                  <input
                    type="text"
                    className="field"
                    placeholder="Ahmet"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Soyisim *</label>
                  <input
                    type="text"
                    className="field"
                    placeholder="Yılmaz"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Email *</label>
                <input
                  type="email"
                  className="field"
                  placeholder="ahmet@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Şirket</label>
                  <input
                    type="text"
                    className="field"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Birim</label>
                  <input
                    type="text"
                    className="field"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Şifre *</label>
                <input
                  type="password"
                  className="field"
                  placeholder="En az 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="text-xs text-dark-500 mt-1">Şifre sadece Supabase Auth tarafında saklanır.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Rol *</label>
                <select
                  className="field"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="manager">Yönetici</option>
                  <option value="tester">Test Kullanıcısı</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Görev (İsteğe Bağlı)</label>
                <input
                  type="text"
                  className="field"
                  placeholder="Örn: Mağaza Müdürü"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Uygulama PIN (4 Hane)</label>
                <input
                  type="text"
                  className="field"
                  placeholder="4 haneli PIN"
                  inputMode="numeric"
                  value={form.applicationPin}
                  onChange={(e) => setForm({ ...form, applicationPin: e.target.value })}
                  maxLength={4}
                />
                <p className="text-xs text-dark-500 mt-1">PIN zorunludur; varsayılan PIN atanmaz.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => setShowModal(false)}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <>
          <div className="overlay open" onClick={() => setShowEditModal(false)} style={{ zIndex: 998 }}></div>
          <div
            className="modal-lg open"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 999,
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="headline-small text-dark-900 flex items-center gap-2"><PencilSquareIcon size={24} strokeWidth={2} /> Kullanıcı Düzenle</h2>
              <button
                className="text-dark-400 hover:text-dark-900 text-2xl"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">İsim *</label>
                  <input
                    type="text"
                    className="field"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Soyisim *</label>
                  <input
                    type="text"
                    className="field"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Email *</label>
                <input
                  type="email"
                  className="field"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Şirket</label>
                  <input
                    type="text"
                    className="field"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Birim</label>
                  <input
                    type="text"
                    className="field"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Rol *</label>
                <select
                  className="field"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  <option value="manager">Yönetici</option>
                  <option value="tester">Test Kullanıcısı</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Görev (İsteğe Bağlı)</label>
                <input
                  type="text"
                  className="field"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Uygulama PIN (4 Hane)</label>
                <input
                  type="text"
                  className="field"
                  inputMode="numeric"
                  value={editForm.applicationPin}
                  onChange={(e) => setEditForm({ ...editForm, applicationPin: e.target.value })}
                  maxLength={4}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong className="inline-flex items-center gap-1"><LightBulbIcon size={16} strokeWidth={2} /> Not:</strong> Şifre değiştirmek için tablodaki "Göster" butonunu kullanın.
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => setShowEditModal(false)}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={submitting}
                >
                  {submitting ? 'Güncelleniyor...' : 'Kullanıcıyı Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Password modal removed; password reset is handled through Supabase Auth. */}
    </Page>
  );
};

window.UserManagement = UserManagement;
