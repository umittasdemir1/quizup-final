const { useState, useEffect } = React;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'manager',
    position: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Auth check
  useEffect(() => {
    if (!requireAuth('admin')) return;
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      await waitFirebase();
      const { db, collection, getDocs, orderBy, query } = window.firebase;
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
    } catch (e) {
      console.error('Load users error:', e);
      toast('Kullanıcılar yüklenemedi', 'error');
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

    setSubmitting(true);
    try {
      await waitFirebase();
      const {
        auth,
        createUserWithEmailAndPassword,
        db,
        doc,
        setDoc,
        serverTimestamp
      } = window.firebase;

      // Firebase Auth'da kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;

      // Firestore'da kullanıcı bilgilerini kaydet
      await setDoc(doc(db, 'users', user.uid), {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        role: form.role,
        position: form.position || null,
        createdAt: serverTimestamp(),
        createdBy: getCurrentUser().uid
      });

      toast('Kullanıcı başarıyla oluşturuldu', 'success');
      setShowModal(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'manager',
        position: ''
      });
      loadUsers();

    } catch (error) {
      console.error('Create user error:', error);

      if (error.code === 'auth/email-already-in-use') {
        toast('Bu email adresi zaten kullanılıyor', 'error');
      } else if (error.code === 'auth/invalid-email') {
        toast('Geçersiz email adresi', 'error');
      } else if (error.code === 'auth/weak-password') {
        toast('Şifre çok zayıf', 'error');
      } else {
        toast('Kullanıcı oluşturulurken hata oluştu', 'error');
      }
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
      loadUsers();
    } catch (e) {
      console.error('Delete user error:', e);
      toast('Kullanıcı silinirken hata oluştu', 'error');
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
          Henüz kullanıcı eklenmemiş.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">İsim</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-dark-700 uppercase">Görev</th>
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
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 text-sm text-dark-600">{user.position || '-'}</td>
                    <td className="px-6 py-4 text-sm text-dark-500">{fmtDate(user.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="text-red-600 hover:text-red-800 font-semibold text-sm"
                        onClick={() => deleteUser(user.id, user.email)}
                      >
                        Sil
                      </button>
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
          <div className="overlay open" onClick={() => setShowModal(false)}></div>
          <div className="modal-lg open">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-dark-900">Yeni Kullanıcı Ekle</h2>
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
                  <label className="block text-sm font-semibold text-dark-700 mb-2">İsim</label>
                  <input
                    type="text"
                    className="field"
                    placeholder="Ahmet"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-700 mb-2">Soyisim</label>
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
                <label className="block text-sm font-semibold text-dark-700 mb-2">Email</label>
                <input
                  type="email"
                  className="field"
                  placeholder="ahmet@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Şifre</label>
                <input
                  type="password"
                  className="field"
                  placeholder="En az 6 karakter"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Rol</label>
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
    </Page>
  );
};

window.UserManagement = UserManagement;
