const { useState, useEffect } = React;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [newPassword, setNewPassword] = useState('');

  const [form, setForm] = useState({
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
    let unsubscribe = null;
    let cancelled = false;

    const subscribeUsers = async () => {
      console.log('=== SUBSCRIBE USERS REALTIME ===');
      setLoading(true);

      try {
        await waitFirebase();

        const user = getCurrentUser();
        console.log('Current user:', user);

        if (!user || user.role !== 'admin') {
          console.error('User is not admin, cannot subscribe users');
          toast('Yetkiniz yok', 'error');
          setUsers([]);
          setLoading(false);
          return;
        }

        const { db, collection, orderBy, query, auth, updateDoc, doc, onSnapshot } = window.firebase;

        if (!auth.currentUser) {
          console.error('Firebase Auth not ready');
          toast('Lütfen tekrar giriş yapın', 'error');
          setUsers([]);
          setLoading(false);
          return;
        }

        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

        unsubscribe = onSnapshot(q, async (snapshot) => {
          console.log('Realtime users snapshot size:', snapshot.size);

          try {
            const data = await Promise.all(snapshot.docs.map(async (d) => {
              const rawData = d.data();
              const normalizedPin = rawData.applicationPin && /^\d{4}$/.test(rawData.applicationPin)
                ? rawData.applicationPin
                : '0000';

              if ((!rawData.applicationPin || !/^\d{4}$/.test(rawData.applicationPin)) && auth.currentUser) {
                try {
                  await updateDoc(doc(db, 'users', d.id), { applicationPin: normalizedPin });
                } catch (pinError) {
                  console.warn('Kullanıcı PIN güncellenemedi:', pinError);
                }
              }

              const activeSessions = rawData.activeSessions && typeof rawData.activeSessions === 'object'
                ? rawData.activeSessions
                : {};

              const userData = {
                id: d.id,
                ...rawData,
                company: rawData.company || '',
                department: rawData.department || '',
                position: rawData.position || '',
                applicationPin: normalizedPin,
                sessionsDisabled: Boolean(rawData.sessionsDisabled),
                activeSessions
              };
              console.log('User realtime update:', userData);
              return userData;
            }));

            if (cancelled) return;

            setUsers(data);
            setLoading(false);
          } catch (processingError) {
            console.error('Realtime users processing error:', processingError);
            if (!cancelled) {
              toast('Kullanıcılar yüklenemedi: ' + (processingError?.message || 'Bilinmeyen hata'), 'error');
              setLoading(false);
            }
          }
        }, (error) => {
          console.error('Realtime users subscription error:', error);
          if (!cancelled) {
            toast('Kullanıcılar yüklenemedi: ' + (error?.message || 'Bilinmeyen hata'), 'error');
            setLoading(false);
          }
        });
      } catch (e) {
        console.error('Subscribe users setup error:', e);
        toast('Kullanıcılar yüklenemedi: ' + (e?.message || 'Bilinmeyen hata'), 'error');
        setLoading(false);
      }
    };

    subscribeUsers();

    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

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
      if (!adminUser || adminUser.role !== 'admin') {
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
        await setDoc(doc(db, 'users', createdUser.uid), {
          firstName: form.firstName,
          lastName: form.lastName,
          email: normalizedEmail,
          password: form.password, // Store password in Firestore for admin access
          role: form.role,
          position: form.position || null,
          company: form.company?.trim() || null,
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
          console.warn('İkincil oturum kapatılamadı', finalizeError);
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

    } catch (error) {
      console.error('Create user error:', error);

      if (!rolledBack && !creationCompleted && creationSession?.rollback) {
        try {
          await creationSession.rollback();
          rolledBack = true;
        } catch (rollbackError) {
          console.warn('Kullanıcı oluşturma geri alımı başarısız', rollbackError);
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

    } catch (error) {
      console.error('Update user error:', error);
      toast('Kullanıcı güncellenirken hata oluştu', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const requestPasswordReveal = (userId) => {
    setEditingUser(users.find(u => u.id === userId));
    setAdminPin('');
    setPinError('');
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const verifyAdminPin = () => {
    const currentUser = getCurrentUser();
    const expectedPin = currentUser?.applicationPin && /^\d{4}$/.test(currentUser.applicationPin)
      ? currentUser.applicationPin
      : '0000';

    if (adminPin === expectedPin) {
      setRevealedPasswords(prev => ({ ...prev, [editingUser.id]: true }));
      setShowPasswordModal(false);
      setAdminPin('');
      setPinError('');
      toast('Şifre gösteriliyor', 'success');
    } else {
      setPinError('Uygulama PIN\'i hatalı!');
    }
  };

  const updateUserPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast('Yeni şifre en az 6 karakter olmalıdır', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await waitFirebase();
      const { db, doc, updateDoc } = window.firebase;

      await updateDoc(doc(db, 'users', editingUser.id), {
        password: newPassword
      });

      toast('Şifre başarıyla güncellendi', 'success');
      setShowPasswordModal(false);
      setEditingUser(null);
      setNewPassword('');

    } catch (error) {
      console.error('Update password error:', error);
      toast('Şifre güncellenirken hata oluştu', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (userId, userEmail) => {
    if (!confirm(`${userEmail} kullanıcısını silmek istediğinize emin misiniz?`)) return;

    try {
      await waitFirebase();
      const { db, doc, deleteDoc } = window.firebase;
      await deleteDoc(doc(db, 'users', userId));
      toast('Kullanıcı silindi', 'success');
    } catch (e) {
      console.error('Delete user error:', e);
      toast('Kullanıcı silinirken hata oluştu', 'error');
    }
  };

  const handleSessionRefresh = () => {
    try {
      if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
        window.location.reload();
      }
    } catch (err) {
      console.warn('Sayfa yenilemesi başarısız oldu:', err);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return <span className="chip bg-red-100 text-red-700">👑 Admin</span>;
    if (role === 'manager') return <span className="chip bg-blue-100 text-blue-700">👔 Yönetici</span>;
    if (role === 'tester') return <span className="chip bg-green-100 text-green-700">✏️ Test Kullanıcısı</span>;
    return <span className="chip">{role}</span>;
  };

  if (loading) return <Page title="Kullanıcı Yönetimi"><LoadingSpinner /></Page>;

  return (
    <Page
      title="Kullanıcı Yönetimi"
      subtitle={`Toplam ${users.length} kullanıcı`}
      extra={
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          ➕ Yeni Kullanıcı
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Şifre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Oturumlar</th>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {revealedPasswords[user.id] ? (
                          <span className="text-sm font-mono text-dark-900">{user.password || '******'}</span>
                        ) : (
                          <span className="text-sm text-dark-400">••••••••</span>
                        )}
                        <button
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                          onClick={() => requestPasswordReveal(user.id)}
                        >
                          {revealedPasswords[user.id] ? '🔓 Değiştir' : '🔒 Göster'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="text-sm text-dark-600">
                          <div className="font-semibold text-dark-700">Aktif oturum</div>
                          <div className="text-xs text-dark-400">
                            {`${Object.keys(user.activeSessions || {}).length} oturum`}
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <button
                            type="button"
                            className="session-refresh-button"
                            onClick={handleSessionRefresh}
                            title="Oturum bilgilerini yenile"
                          >
                            <span className="session-refresh-button__label">Refresh</span>
                            <span className="session-refresh-button__icon" aria-hidden="true">⟳</span>
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-500">{fmtDate(user.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                          onClick={() => openEditModal(user)}
                        >
                          ✏️ Düzenle
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 font-semibold text-sm"
                          onClick={() => deleteUser(user.id, user.email)}
                        >
                          🗑️ Sil
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
              <h2 className="text-2xl font-bold text-dark-900">➕ Yeni Kullanıcı Ekle</h2>
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
                  type="text"
                  className="field"
                  placeholder="En az 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="text-xs text-dark-500 mt-1">Şifre Firestore'da saklanacaktır</p>
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
              <h2 className="text-2xl font-bold text-dark-900">✏️ Kullanıcı Düzenle</h2>
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
                <strong>💡 Not:</strong> Şifre değiştirmek için tablodaki "Göster" butonunu kullanın.
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

      {/* Password Modal */}
      {showPasswordModal && editingUser && (
        <>
          <div className="overlay open" onClick={() => setShowPasswordModal(false)} style={{ zIndex: 998 }}></div>
          <div
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
              maxWidth: '500px',
              width: '90%'
            }}
          >
            <div className="mb-6">
              <h3 className="text-xl font-bold text-dark-900 mb-2">🔒 Şifre Yönetimi</h3>
              <p className="text-sm text-dark-600">
                <strong>{editingUser.firstName} {editingUser.lastName}</strong> ({editingUser.email})
              </p>
            </div>

            {!revealedPasswords[editingUser.id] ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                  <strong>⚠️ Güvenlik:</strong> Şifreyi görmek için uygulama PIN'inizi girin.
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Uygulama PIN</label>
                  <input
                    type="password"
                    className="field"
                    placeholder="PIN"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && verifyAdminPin()}
                    autoFocus
                  />
                  {pinError && (
                    <div className="text-red-600 text-sm mt-2">❌ {pinError}</div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    className="btn btn-ghost flex-1"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    İptal
                  </button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={verifyAdminPin}
                  >
                    Doğrula
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-sm text-green-800 mb-2">
                    <strong>Mevcut Şifre:</strong>
                  </div>
                  <div className="font-mono text-lg text-dark-900 bg-white p-3 rounded border">
                    {editingUser.password || 'Şifre kaydedilmemiş'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Yeni Şifre</label>
                  <input
                    type="text"
                    className="field"
                    placeholder="En az 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-dark-500 mt-1">Yeni şifre Firestore'da güncellenecek</p>
                </div>

                <div className="flex gap-3">
                  <button
                    className="btn btn-ghost flex-1"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setNewPassword('');
                    }}
                  >
                    Kapat
                  </button>
                  <button
                    className="btn btn-primary flex-1"
                    onClick={updateUserPassword}
                    disabled={submitting}
                  >
                    {submitting ? 'Güncelleniyor...' : '💾 Şifreyi Güncelle'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Page>
  );
};

window.UserManagement = UserManagement;
