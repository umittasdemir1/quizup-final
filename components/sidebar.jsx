const { useState, useEffect, useRef } = React;

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState(0);
  const [userProfile, setUserProfile] = useState(getCurrentUser());
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFormError, setProfileFormError] = useState('');
  const [passwordFormError, setPasswordFormError] = useState('');
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    company: '',
    department: '',
    position: '',
    verifyPin: '',
    newPin: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    pin: ''
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [globalLogoutModal, setGlobalLogoutModal] = useState(false);
  const [globalLogoutPin, setGlobalLogoutPin] = useState('');
  const [globalLogoutError, setGlobalLogoutError] = useState('');
  const [globalLogoutProcessing, setGlobalLogoutProcessing] = useState(false);
  const route = useHash();
  const existingPinRef = useRef('0000');
  const currentUser = userProfile;
  const isLoggedIn = currentUser !== null;

  // Load pending suggestions count for admin
  useEffect(() => {
    if (isLoggedIn && hasRole('admin')) {
      loadPendingCount();
      // Refresh every 30 seconds
      const interval = setInterval(loadPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const syncUser = () => setUserProfile(getCurrentUser());

    window.addEventListener('storage', syncUser);
    window.addEventListener('currentUserUpdated', syncUser);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('currentUserUpdated', syncUser);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setShowUserMenu(false);
      setProfileModalOpen(false);
      setGlobalLogoutModal(false);
    }
  }, [isLoggedIn]);

  const loadPendingCount = async () => {
    try {
      await waitFirebase();

      // Double check: Only admin can load pending count
      const user = getCurrentUser();
      if (!user || user.role !== 'admin') {
        console.log('Skipping pending count load: User is not admin');
        return;
      }

      const { db, collection, getDocs, query, where, auth } = window.firebase;

      // Ensure Firebase Auth is ready
      if (!auth.currentUser) {
        console.log('Skipping pending count load: Firebase Auth not ready');
        return;
      }

      const q = query(collection(db, 'suggestedQuestions'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      setPendingSuggestions(snapshot.size);
      console.log('Pending suggestions count:', snapshot.size);
    } catch (e) {
      console.error('Load pending count error:', e);
      // Silent fail - don't show toast to user
    }
  };

  const isActive = (path) => {
    if (path === '/') return route === '/';
    // Exact match for conflicting paths
    if (path === '/suggest' || path === '/suggestions') {
      return route === path;
    }
    return route.startsWith(path);
  };

  useEffect(() => {
    if (open) {
      setOpen(false);
    }
  }, [route]);

  // Hide sidebar on landing and login pages
  const hideSidebar = route === '/' || route === '/login' || route.startsWith('/login');

  // Logo click handler
  const handleLogoClick = () => {
    if (isLoggedIn && hasRole(['admin', 'manager'])) {
      location.hash = '#/dashboard';
    } else {
      location.hash = '#/';
    }
  };

  const isValidPin = (val) => /^\d{4}$/.test(val);

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setProfileFormError('');
    setPasswordFormError('');
  };

  const handleOpenProfileModal = async () => {
    setProfileModalOpen(true);
    setProfileLoading(true);
    setProfileFormError('');
    setPasswordFormError('');

    try {
      await waitFirebase();
      const profile = await window.firebase.fetchCurrentUserProfile();
      existingPinRef.current = profile.appPin || '0000';

      setProfileForm({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        company: profile.company || '',
        department: profile.department || profile.unit || '',
        position: profile.position || '',
        verifyPin: '',
        newPin: ''
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        pin: ''
      });
    } catch (err) {
      console.error('Kullanıcı profili yüklenemedi', err);
      setProfileFormError(err.message || 'Kullanıcı bilgileri yüklenemedi');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (profileSaving) return;

    setProfileFormError('');
    setPasswordFormError('');

    const pinToVerify = profileForm.verifyPin.trim();
    if (!isValidPin(pinToVerify)) {
      setProfileFormError('Lütfen 4 haneli geçerli PIN girin');
      return;
    }

    const updates = {
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      company: profileForm.company,
      department: profileForm.department,
      position: profileForm.position
    };

    if (profileForm.newPin) {
      if (!isValidPin(profileForm.newPin)) {
        setProfileFormError('Yeni PIN 4 haneli olmalıdır');
        return;
      }
      updates.appPin = profileForm.newPin;
    }

    setProfileSaving(true);
    try {
      await waitFirebase();
      const updatedProfile = await window.firebase.updateCurrentUserProfileWithPin({
        pin: pinToVerify,
        updates
      });

      const merged = mergeCurrentUser({
        firstName: updatedProfile.firstName || '',
        lastName: updatedProfile.lastName || '',
        company: updatedProfile.company || '',
        department: updatedProfile.department || '',
        unit: updatedProfile.unit || '',
        position: updatedProfile.position || '',
        appPin: updatedProfile.appPin || existingPinRef.current
      });

      setUserProfile(merged);
      existingPinRef.current = updatedProfile.appPin || existingPinRef.current;
      setProfileForm((prev) => ({
        ...prev,
        verifyPin: '',
        newPin: ''
      }));

      toast('Kullanıcı bilgileri güncellendi', 'success');
    } catch (err) {
      console.error('Kullanıcı bilgileri güncellenemedi', err);
      setProfileFormError(err.message || 'Kullanıcı bilgileri güncellenemedi');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordSaving) return;

    setPasswordFormError('');
    setProfileFormError('');

    const pinValue = passwordForm.pin.trim();
    if (!isValidPin(pinValue)) {
      setPasswordFormError('PIN doğrulaması için 4 haneli kod girin');
      return;
    }

    if (!passwordForm.currentPassword) {
      setPasswordFormError('Mevcut şifre gereklidir');
      return;
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPasswordFormError('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFormError('Yeni şifreler eşleşmiyor');
      return;
    }

    setPasswordSaving(true);
    try {
      await waitFirebase();
      const updatedProfile = await window.firebase.updateCurrentUserPasswordWithPin({
        pin: pinValue,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      const merged = mergeCurrentUser({ password: updatedProfile.password });
      setUserProfile(merged);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        pin: ''
      });

      toast('Şifre başarıyla güncellendi', 'success');
    } catch (err) {
      console.error('Şifre güncellenemedi', err);
      setPasswordFormError(err.message || 'Şifre güncellenemedi');
    } finally {
      setPasswordSaving(false);
    }
  };

  const openGlobalLogoutModal = () => {
    setGlobalLogoutModal(true);
    setGlobalLogoutPin('');
    setGlobalLogoutError('');
  };

  const closeGlobalLogoutModal = () => {
    setGlobalLogoutModal(false);
    setGlobalLogoutPin('');
    setGlobalLogoutError('');
  };

  const handleAllDevicesLogout = async (e) => {
    e.preventDefault();
    if (globalLogoutProcessing) return;

    setGlobalLogoutError('');
    const pinValue = globalLogoutPin.trim();
    if (!isValidPin(pinValue)) {
      setGlobalLogoutError('Lütfen 4 haneli PIN girin');
      return;
    }

    setGlobalLogoutProcessing(true);
    try {
      await waitFirebase();
      await window.firebase.clearAllSessionsForCurrentUser({ pin: pinValue });
      toast('Tüm cihazlardaki oturumlar kapatıldı', 'success');
      closeGlobalLogoutModal();
      setShowUserMenu(false);
      await logout();
    } catch (err) {
      console.error('Tüm cihazlarda oturumu kapatma hatası', err);
      setGlobalLogoutError(err.message || 'İşlem tamamlanamadı');
    } finally {
      setGlobalLogoutProcessing(false);
      setGlobalLogoutPin('');
    }
  };

  return (
    <>
      <div
        className={'overlay ' + (open ? 'open' : '')}
        onClick={() => setOpen(false)}
      ></div>

      {!hideSidebar && (
        <div className={'sidebar ' + (open ? 'open' : '')}>
          <div className="p-6 border-b border-dark-700 cursor-pointer hover:bg-dark-800 transition-colors" onClick={handleLogoClick}>
            <div className="flex items-center gap-3">
              <div className="logo-icon">?</div>
              <div>
                <div className="text-xl font-bold text-white">QuizUp+</div>
                <div className="text-xs text-dark-300">Boost Your Knowledge</div>
              </div>
            </div>
          </div>

          <nav className="py-4">
            {/* Admin: See everything */}
            {hasRole('admin') && (
              <>
                <a href="#/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
                  <span>📈</span>
                  <span>Dashboard</span>
                </a>

                <a href="#/admin" className={isActive('/admin') ? 'active' : ''}>
                  <span>⚙️</span>
                  <span>Soru Havuzu</span>
                </a>

                <a href="#/manager" className={isActive('/manager') ? 'active' : ''}>
                  <span>📊</span>
                  <span>Yönetici Paneli</span>
                </a>

                <a href="#/tests" className={isActive('/tests') ? 'active' : ''}>
                  <span>📝</span>
                  <span>Testler</span>
                </a>

                <a href="#/suggest" className={isActive('/suggest') ? 'active' : ''}>
                  <span>💡</span>
                  <span>Soru Öner</span>
                </a>

                <a href="#/suggestions" className={isActive('/suggestions') ? 'active' : ''} style={{ position: 'relative' }}>
                  <span>📬</span>
                  <span>Soru Önerileri</span>
                  {pendingSuggestions > 0 && (
                    <span style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: '#FF6B4A',
                      color: 'white',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      minWidth: '20px',
                      textAlign: 'center'
                    }}>
                      {pendingSuggestions}
                    </span>
                  )}
                </a>

                <a href="#/branding" className={isActive('/branding') ? 'active' : ''}>
                  <span>🎨</span>
                  <span>Marka Ayarları</span>
                </a>

                <a href="#/users" className={isActive('/users') ? 'active' : ''}>
                  <span>👥</span>
                  <span>Kullanıcı Yönetimi</span>
                </a>
              </>
            )}

            {/* Manager: Dashboard, Manager Panel, Tests, Suggest */}
            {hasRole('manager') && (
              <>
                <a href="#/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
                  <span>📈</span>
                  <span>Dashboard</span>
                </a>

                <a href="#/manager" className={isActive('/manager') ? 'active' : ''}>
                  <span>📊</span>
                  <span>Yönetici Paneli</span>
                </a>

                <a href="#/tests" className={isActive('/tests') ? 'active' : ''}>
                  <span>📝</span>
                  <span>Testler</span>
                </a>

                <a href="#/suggest" className={isActive('/suggest') ? 'active' : ''}>
                  <span>💡</span>
                  <span>Soru Öner</span>
                </a>
              </>
            )}

            {/* Tester: Tests and Suggest */}
            {hasRole('tester') && (
              <>
                <a href="#/tests" className={isActive('/tests') ? 'active' : ''}>
                  <span>📝</span>
                  <span>Testler</span>
                </a>

                <a href="#/suggest" className={isActive('/suggest') ? 'active' : ''}>
                  <span>💡</span>
                  <span>Soru Öner</span>
                </a>
              </>
            )}

            {/* Not logged in / Anonymous users */}
            {!isLoggedIn && (
              <>
                <a href="#/mytests" className={isActive('/mytests') ? 'active' : ''}>
                  <span>📝</span>
                  <span>Testlerim</span>
                </a>
                <a href="#/suggest" className={isActive('/suggest') ? 'active' : ''}>
                  <span>💡</span>
                  <span>Soru Öner</span>
                </a>
              </>
            )}
          </nav>
        </div>
      )}

      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {!hideSidebar && (
            <div
              className={'hamburger ' + (open ? 'open' : '')}
              onClick={() => setOpen(v => !v)}
            >
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}

          {hideSidebar && <div className="w-8"></div>}

          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleLogoClick}>
            <div className="logo-icon">?</div>
            <span className="font-bold text-xl text-dark-900">QuizUp+</span>
          </div>

          {isLoggedIn ? (
            <div className="relative">
              <button
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setShowUserMenu(v => !v)}
              >
                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold">
                  {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                </div>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="p-4 border-b border-gray-200">
                      <div className="font-semibold text-dark-900">
                        {currentUser.firstName} {currentUser.lastName}
                      </div>
                      <div className="text-sm text-dark-500">{currentUser.email}</div>
                      {currentUser.position && (
                        <div className="text-xs text-dark-400 mt-1">{currentUser.position}</div>
                      )}
                    </div>
                    <div className="p-2 space-y-1">
                      <button
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => {
                          setShowUserMenu(false);
                          handleOpenProfileModal();
                        }}
                      >
                        👤 Kullanıcı Bilgileri
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => {
                          setShowUserMenu(false);
                          openGlobalLogoutModal();
                        }}
                      >
                        🛑 Tüm cihazlarda oturumu kapat
                      </button>
                      <div className="pt-2 border-t border-gray-100"></div>
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                      >
                        🚪 Çıkış Yap
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-8"></div>
          )}
        </div>
      </header>

      {profileModalOpen && (
        <>
          <div className="overlay open" onClick={closeProfileModal} style={{ zIndex: 998 }}></div>
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
              width: 'min(640px, 92vw)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-dark-900">👤 Kullanıcı Bilgileri</h2>
                <p className="text-sm text-dark-500">Profil ve güvenlik bilgilerinizi güncelleyin</p>
              </div>
              <button className="text-dark-400 hover:text-dark-900 text-2xl" onClick={closeProfileModal}>×</button>
            </div>

            {profileLoading ? (
              <div className="py-10">
                <LoadingSpinner text="Bilgiler yükleniyor..." />
              </div>
            ) : (
              <div className="space-y-6">
                {profileFormError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {profileFormError}
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">İsim</label>
                      <input
                        type="text"
                        className="field"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="İsim"
                        autoComplete="given-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">Soyisim</label>
                      <input
                        type="text"
                        className="field"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Soyisim"
                        autoComplete="family-name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">Şirket</label>
                      <input
                        type="text"
                        className="field"
                        value={profileForm.company}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Şirket"
                        autoComplete="organization"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">Birim</label>
                      <input
                        type="text"
                        className="field"
                        value={profileForm.department}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="Birim"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-dark-700 mb-2">Görev</label>
                    <input
                      type="text"
                      className="field"
                      value={profileForm.position}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="Görev"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">Yeni Uygulama PIN (4 Hane)</label>
                      <input
                        type="password"
                        className="field"
                        value={profileForm.newPin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setProfileForm(prev => ({ ...prev, newPin: value }));
                        }}
                        placeholder="****"
                        maxLength={4}
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">Mevcut PIN</label>
                      <input
                        type="password"
                        className="field"
                        value={profileForm.verifyPin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setProfileForm(prev => ({ ...prev, verifyPin: value }));
                        }}
                        placeholder="PIN doğrulaması"
                        maxLength={4}
                        inputMode="numeric"
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button type="button" className="btn btn-ghost" onClick={closeProfileModal}>
                      İptal
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                      {profileSaving ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
                    </button>
                  </div>
                </form>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-dark-900 mb-3">🔐 Şifre Değiştir</h3>
                  <p className="text-sm text-dark-500 mb-3">Şifrenizi güncellemek için mevcut şifreniz ve uygulama PIN'iniz gereklidir.</p>

                  {passwordFormError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-3">
                      {passwordFormError}
                    </div>
                  )}

                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">Mevcut Şifre</label>
                      <input
                        type="password"
                        className="field"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Mevcut şifreniz"
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-dark-700 mb-2">Yeni Şifre</label>
                        <input
                          type="password"
                          className="field"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="En az 6 karakter"
                          autoComplete="new-password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-dark-700 mb-2">Yeni Şifre (Tekrar)</label>
                        <input
                          type="password"
                          className="field"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Yeni şifre tekrar"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">Uygulama PIN</label>
                      <input
                        type="password"
                        className="field"
                        value={passwordForm.pin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setPasswordForm(prev => ({ ...prev, pin: value }));
                        }}
                        placeholder="PIN"
                        maxLength={4}
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                        {passwordSaving ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {globalLogoutModal && (
        <>
          <div className="overlay open" onClick={closeGlobalLogoutModal} style={{ zIndex: 998 }}></div>
          <div
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
              width: 'min(420px, 90vw)'
            }}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-dark-900 mb-2">🛑 Tüm cihazlarda oturumu kapat</h3>
              <p className="text-sm text-dark-600">
                Bu işlem hesabınızın bağlı olduğu tüm cihazlardaki aktif oturumları sonlandırır. Devam etmek için uygulama PIN'inizi girin.
              </p>
            </div>

            {globalLogoutError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-3">
                {globalLogoutError}
              </div>
            )}

            <form onSubmit={handleAllDevicesLogout} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Uygulama PIN</label>
                <input
                  type="password"
                  className="field"
                  value={globalLogoutPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setGlobalLogoutPin(value);
                  }}
                  placeholder="PIN"
                  maxLength={4}
                  inputMode="numeric"
                  autoFocus
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn btn-ghost flex-1" onClick={closeGlobalLogoutModal}>
                  İptal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                  disabled={globalLogoutProcessing}
                >
                  {globalLogoutProcessing ? 'İşlem yapılıyor...' : 'Tüm Oturumları Kapat'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
};

window.Sidebar = Sidebar;
