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
    password: '', // Temporary password for Firebase Auth only (not stored in Firestore)
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
    window.devLog('=== LOADING USERS ===');
    try {
      await waitFirebase();

      // Check if user is admin or super admin
      const user = getCurrentUser();
      window.devLog('Current user:', user);
      if (!user || (user.role !== 'admin' && user.role !== 'SuperAdmin' && !user.isSuperAdmin)) {
        window.devError('User is not admin, cannot load users');
        toast('Yetkiniz yok', 'error');
        setLoading(false);
        return;
      }

      const { db, collection, getDocs, orderBy, query, where, auth, updateDoc, doc } = window.firebase;
      window.devLog('Firebase ready, Firebase Auth user:', auth.currentUser);

      // Ensure Firebase Auth is ready
      if (!auth.currentUser) {
        window.devError('Firebase Auth not ready');
        toast('Lütfen tekrar giriş yapın', 'error');
        setLoading(false);
        return;
      }

      window.devLog('Querying users collection...');

      // 🔒 Super admin seçtiği şirkete göre, admin kendi şirketini görür
      const currentUser = getCurrentUser();
      const isSuperAdminUser = currentUser?.isSuperAdmin === true || currentUser?.role === 'SuperAdmin';

      // Get company identifiers for backward compatibility (checks both ID and name)
      const companyIdentifiers = getCompanyIdentifiersForQuery();

      let q;
      if (isSuperAdminUser && companyIdentifiers === null) {
        // Super admin: Tüm şirketlerin kullanıcıları
        window.devLog('Super admin: Loading all users from all companies');
        q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc')
        );
      } else if (companyIdentifiers && companyIdentifiers.length === 0) {
        // No company assigned - no users to show
        setUsers([]);
        setLoading(false);
        return;
      } else if (isSuperAdminUser && companyIdentifiers) {
        // Super admin: Seçili şirketin kullanıcıları
        window.devLog('Super admin: Loading users for selected company:', companyIdentifiers);
        q = query(
          collection(db, 'users'),
          where('company', 'in', companyIdentifiers),
          orderBy('createdAt', 'desc')
        );
      } else {
        // Regular admin: Sadece kendi şirketinin kullanıcılarını getir
        const userCompany = currentUser?.company || 'BLUEMINT';
        window.devLog('Admin: Loading users for company:', userCompany);
        q = query(
          collection(db, 'users'),
          where('company', '==', userCompany),
          orderBy('createdAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      window.devLog('Users snapshot size:', snapshot.size);

      const data = await Promise.all(snapshot.docs.map(async (d) => {
        const rawData = d.data();
        const normalizedPin = rawData.applicationPin && /^\d{4}$/.test(rawData.applicationPin)
          ? rawData.applicationPin
          : '0000';

        if ((!rawData.applicationPin || !/^\d{4}$/.test(rawData.applicationPin)) && auth.currentUser) {
          try {
            await updateDoc(doc(db, 'users', d.id), { applicationPin: normalizedPin });
          } catch (pinError) {
            window.devWarn('Kullanıcı PIN güncellenemedi:', pinError);
          }
        }

        const userData = {
          id: d.id,
          ...rawData,
          company: rawData.company || '',
          department: rawData.department || '',
          position: rawData.position || '',
          applicationPin: normalizedPin
        };
        window.devLog('User:', userData);
        return userData;
      }));

      window.devLog('Total users loaded:', data.length);
      setUsers(data);
    } catch (e) {
      window.devError('Load users error:', e);
      window.devError('Error code:', e.code);
      window.devError('Error message:', e.message);
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

    if (form.applicationPin && !/^\d{4}$/.test(form.applicationPin)) {
      toast('Uygulama PIN\'i 4 haneli olmalıdır', 'error');
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedPin = form.applicationPin?.trim();
    const applicationPin = normalizedPin && /^\d{4}$/.test(normalizedPin) ? normalizedPin : '0000';

    setSubmitting(true);
    let creationSession = null;
    let rolledBack = false;
    let creationCompleted = false;
    try {
      await waitFirebase();
      const {
        createUserWithEmailAndPasswordAsAdmin,
        db,
        doc,
        setDoc,
        serverTimestamp
      } = window.firebase;

      const adminUser = getCurrentUser();
      const isAdmin = adminUser?.role === 'admin';
      const isSuperAdmin = adminUser?.isSuperAdmin === true;

      if (!adminUser || (!isAdmin && !isSuperAdmin)) {
        throw Object.assign(new Error('Yönetici oturumu bulunamadı'), { code: 'auth/admin-required' });
      }

      // Firebase Auth'da kullanıcı oluştur
      creationSession = await createUserWithEmailAndPasswordAsAdmin(normalizedEmail, form.password);
      const createdUser = creationSession?.user;

      if (!createdUser?.uid) {
        throw new Error('Yeni kullanıcı kimliği alınamadı');
      }

      // Firestore'da kullanıcı bilgilerini kaydet
      try {
        // 🆕 Yeni kullanıcıyı oluşturan admin'in şirketini otomatik ata
        const currentUser = getCurrentUser();

        // Company determination logic
        let userCompany;
        if (currentUser.isSuperAdmin === true) {
          // Super Admin: Use form.company if provided, otherwise use selected company
          if (form.company && form.company.trim()) {
            userCompany = form.company.trim();
          } else {
            // Fall back to selected company
            const selectedCompanyData = localStorage.getItem('superadmin:selectedCompanyData');
            if (selectedCompanyData) {
              const companyData = JSON.parse(selectedCompanyData);
              if (companyData.id !== 'all') {
                userCompany = companyData.name || companyData.id;
              } else {
                throw new Error('Lütfen şirket alanını doldurun veya sidebar\'dan bir şirket seçin');
              }
            } else {
              throw new Error('Lütfen şirket alanını doldurun veya sidebar\'dan bir şirket seçin');
            }
          }
        } else {
          // Regular admin: Use their own company
          userCompany = currentUser?.company || 'BLUEMINT';
        }

        await setDoc(doc(db, 'users', createdUser.uid), {
          firstName: form.firstName,
          lastName: form.lastName,
          email: normalizedEmail,
          // 🔒 SECURITY: Password is NEVER stored in Firestore, only in Firebase Auth
          role: form.role,
          position: form.position || null,
          company: userCompany, // 🆕 Otomatik şirket ataması (form yerine)
          department: form.department?.trim() || null,
          applicationPin,
          createdAt: serverTimestamp(),
          createdBy: adminUser.uid
        });
      } catch (firestoreError) {
        if (creationSession?.rollback) {
          await creationSession.rollback();
          rolledBack = true;
        }
        throw firestoreError;
      }

      if (creationSession?.finalize) {
        try {
          await creationSession.finalize();
        } catch (finalizeError) {
          window.devWarn('İkincil oturum kapatılamadı', finalizeError);
        }
      }

      creationCompleted = true;

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

      if (!rolledBack && !creationCompleted && creationSession?.rollback) {
        try {
          await creationSession.rollback();
          rolledBack = true;
        } catch (rollbackError) {
          window.devWarn('Kullanıcı oluşturma geri alımı başarısız', rollbackError);
        }
      }

      if (error.code === 'auth/email-already-in-use') {
        toast('Bu email adresi zaten kullanılıyor', 'error');
      } else if (error.code === 'auth/invalid-email') {
        toast('Geçersiz email adresi', 'error');
      } else if (error.code === 'auth/weak-password') {
        toast('Şifre çok zayıf', 'error');
      } else if (error.code === 'auth/admin-required') {
        toast('Yönetici oturumunuz bulunamadı. Lütfen tekrar giriş yapın.', 'error');
      } else if (error.code === 'permission-denied') {
        toast('Bu işlem için yetkiniz yok. Lütfen yönetici hesabıyla giriş yapın.', 'error');
      } else {
        const fallbackMessage = error?.message
          ? `Kullanıcı oluşturulurken hata oluştu: ${error.message}`
          : 'Kullanıcı oluşturulurken hata oluştu';
        toast(fallbackMessage, 'error');
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
      company: user.company || '',
      department: user.department || '',
      applicationPin: user.applicationPin || '0000'
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editForm.firstName || !editForm.lastName || !editForm.email) {
      toast('Lütfen tüm zorunlu alanları doldurun', 'error');
      return;
    }

    if (editForm.applicationPin && !/^\d{4}$/.test(editForm.applicationPin)) {
      toast('Uygulama PIN\'i 4 haneli olmalıdır', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await waitFirebase();
      const { db, doc, updateDoc } = window.firebase;

      const applicationPin = editForm.applicationPin?.trim()
        ? editForm.applicationPin.trim()
        : '0000';

      await updateDoc(doc(db, 'users', editingUser.id), {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        role: editForm.role,
        position: editForm.position || null,
        company: editForm.company?.trim() || null,
        department: editForm.department?.trim() || null,
        applicationPin
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

  // 🔒 SECURITY: Password management removed from Firestore
  // Passwords are managed solely through Firebase Authentication
  // For password reset, use Firebase's sendPasswordResetEmail function

  const sendPasswordReset = async (userEmail, userName) => {
    if (!confirm(`${userName} (${userEmail}) adresine şifre sıfırlama maili göndermek istediğinize emin misiniz?`)) return;

    try {
      await waitFirebase();
      const { auth, sendPasswordResetEmail } = window.firebase;

      await sendPasswordResetEmail(auth, userEmail);
      toast('Şifre sıfırlama maili başarıyla gönderildi', 'success');
    } catch (error) {
      window.devError('Password reset error:', error);

      if (error.code === 'auth/user-not-found') {
        toast('Kullanıcı Firebase Authentication\'da bulunamadı', 'error');
      } else if (error.code === 'auth/invalid-email') {
        toast('Geçersiz email adresi', 'error');
      } else if (error.code === 'auth/too-many-requests') {
        toast('Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.', 'error');
      } else {
        toast('Şifre sıfırlama maili gönderilemedi: ' + (error.message || 'Bilinmeyen hata'), 'error');
      }
    }
  };

  const deleteUser = async (userId, userEmail) => {
    if (!confirm(`${userEmail} kullanıcısını silmek istediğinize emin misiniz?\n\nBu işlem Firebase Auth ve Firestore'dan tamamen silecek.`)) return;

    try {
      await waitFirebase();
      const { deleteUserByAdmin } = window.firebase;

      // Call Cloud Function to delete from both Auth and Firestore
      console.log('🗑️ Deleting user:', userId, userEmail);
      const result = await deleteUserByAdmin(userId);
      console.log('✅ Delete result:', result);

      toast(result.message || 'Kullanıcı silindi', 'success');
      loadUsers();
    } catch (e) {
      window.devError('Delete user error:', e);

      // Handle Cloud Function errors
      if (e.code === 'unauthenticated') {
        toast('Bu işlem için giriş yapmalısınız', 'error');
      } else if (e.code === 'permission-denied') {
        toast('Bu işlem için yönetici yetkisi gerekiyor', 'error');
      } else if (e.message) {
        toast(e.message, 'error');
      } else {
        toast('Kullanıcı silinirken hata oluştu', 'error');
      }
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
                    <td className="px-6 py-4 text-sm text-dark-600">{user.company || '-'}</td>
                    <td className="px-6 py-4 text-sm text-dark-600">{user.department || '-'}</td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 text-sm text-dark-600">{user.position || '-'}</td>
                    <td className="px-6 py-4 text-sm font-mono text-dark-900">{user.applicationPin || '0000'}</td>
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
                <p className="text-xs text-dark-500 mt-1">🔒 Şifre sadece Firebase Authentication'da saklanır (Firestore'da değil)</p>
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
                <p className="text-xs text-dark-500 mt-1">Belirtilmezse sistem varsayılan PIN'i atar.</p>
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

      {/* 🔒 Password Modal Removed - Passwords are managed through Firebase Authentication only */}
      {/* For password reset, admins should use Firebase Console or implement sendPasswordResetEmail */}
    </Page>
  );
};

window.UserManagement = UserManagement;
