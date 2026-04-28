const { useState, useEffect } = React;

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [pendingSuggestions, setPendingSuggestions] = useState(0);
  const route = useHash();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [userInfoLoading, setUserInfoLoading] = useState(false);
  const [userInfoForm, setUserInfoForm] = useState({
    firstName: '',
    lastName: '',
    company: '',
    department: '',
    position: '',
    applicationPin: ''
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [savingUserInfo, setSavingUserInfo] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showSignOutAllModal, setShowSignOutAllModal] = useState(false);
  const [signOutAllPin, setSignOutAllPin] = useState('');
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [signOutAllError, setSignOutAllError] = useState('');
  const isLoggedIn = currentUser !== null;

  // Super Admin: Company switcher
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(() => {
    try {
      return localStorage.getItem('superadmin:selectedCompany') || 'all';
    } catch {
      return 'all';
    }
  });
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  // Load pending suggestions count for admin
  useEffect(() => {
    if (isLoggedIn && (currentUser?.role === 'admin' || currentUser?.role === 'SuperAdmin' || isSuperAdmin())) {
      loadPendingCount();
      // Refresh every 30 seconds
      const interval = setInterval(loadPendingCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    const syncUser = () => {
      setCurrentUser(getCurrentUser());
    };

    window.addEventListener('user-info-updated', syncUser);
    window.addEventListener('quizup-auth-state', syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('user-info-updated', syncUser);
      window.removeEventListener('quizup-auth-state', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const loadPendingCount = async () => {
    try {
      const user = getCurrentUser();
      if (!user || (user.role !== 'admin' && user.role !== 'SuperAdmin' && !user.isSuperAdmin)) {
        window.devLog('Skipping pending count load: User is not admin');
        return;
      }

      let companyId = user.companyId || null;
      if (user.isSuperAdmin) {
        try {
          const selected = JSON.parse(localStorage.getItem('superadmin:selectedCompanyData') || 'null');
          companyId = selected?.id && selected.id !== 'all' ? selected.id : null;
        } catch {
          companyId = null;
        }
      }

      const suggestions = await window.db.getSuggestedQuestions(companyId);
      const pendingCount = suggestions.filter(s => s.status === 'pending').length;
      setPendingSuggestions(pendingCount);
      window.devLog('Pending suggestions count:', pendingCount);
    } catch (e) {
      window.devError('Load pending count error:', e);
      // Silent fail - don't show toast to user
    }
  };

  // Load companies for super admin
  const loadCompanies = async () => {
    if (!isSuperAdmin()) return;

    setCompaniesLoading(true);
    try {
      const companiesList = await window.db.getCompanies();

      setCompanies(companiesList);
      window.devLog('Companies loaded:', companiesList.length);

      // Initialize localStorage if not set
      if (!localStorage.getItem('superadmin:selectedCompanyData')) {
        localStorage.setItem('superadmin:selectedCompany', 'all');
        localStorage.setItem('superadmin:selectedCompanyData', JSON.stringify({ id: 'all', name: 'all' }));
        window.devLog('Initialized localStorage with "all" companies');
      }
    } catch (e) {
      window.devError('Load companies error:', e);
      toast('Şirketler yüklenemedi', 'error');
    } finally {
      setCompaniesLoading(false);
    }
  };

  // Load companies on mount for super admin
  useEffect(() => {
    if (isLoggedIn && isSuperAdmin()) {
      loadCompanies();
    }
  }, [isLoggedIn, currentUser]);

  // Handle company selection
  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    setShowCompanyDropdown(false);
    try {
      // Store company data with both ID and name for backward compatibility
      const companyData = companies.find(c => c.id === companyId || c._supabaseId === companyId);
      const dataToStore = companyId === 'all'
        ? JSON.stringify({ id: 'all', name: 'all' })
        : JSON.stringify({ id: companyId, name: companyData?.name || companyId });

      localStorage.setItem('superadmin:selectedCompany', companyId);
      localStorage.setItem('superadmin:selectedCompanyData', dataToStore);

      window.dispatchEvent(new CustomEvent('company-changed', { detail: { companyId } }));
      toast(companyId === 'all' ? 'Tüm şirketler görüntüleniyor' : `Şirket değiştirildi: ${companyData?.name || companyId}`, 'success');
    } catch (e) {
      window.devError('Error saving selected company:', e);
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
    if (!currentUser?.uid) return;

    closeUserMenu();
    setUserInfoForm({
      firstName: currentUser.firstName || '',
      lastName: currentUser.lastName || '',
      company: currentUser.companyName || currentUser.company || '',
      department: currentUser.department || '',
      position: currentUser.position || '',
      applicationPin: currentUser.applicationPin && /^\d{4}$/.test(currentUser.applicationPin)
        ? currentUser.applicationPin
        : ''
    });
    setShowUserInfoModal(true);
    setUserInfoLoading(true);

    try {
      const profile = await window.db.getProfileById(currentUser.uid);

      if (profile) {
        setUserInfoForm({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          company: profile.companyName || profile.company || '',
          department: profile.department || '',
          position: profile.position || '',
          applicationPin: profile.applicationPin && /^\d{4}$/.test(profile.applicationPin)
            ? profile.applicationPin
            : ''
        });
      }
    } catch (error) {
      window.devError('Kullanıcı bilgileri yüklenemedi:', error);
      toast('Kullanıcı bilgileri yüklenemedi', 'error');
    } finally {
      setUserInfoLoading(false);
    }
  };

  const closeUserInfoModal = () => {
    setShowUserInfoModal(false);
    setUserInfoLoading(false);
    setSavingUserInfo(false);
    setChangingPassword(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  const openSignOutAllModal = () => {
    closeUserMenu();
    setSignOutAllPin('');
    setSignOutAllError('');
    setSigningOutAll(false);
    setShowSignOutAllModal(true);
  };

  const closeSignOutAllModal = () => {
    setShowSignOutAllModal(false);
    setSignOutAllPin('');
    setSignOutAllError('');
    setSigningOutAll(false);
  };

  const handleSignOutAllDevices = async (e) => {
    e.preventDefault();

    if (!currentUser?.uid) {
      toast('Kullanıcı oturumu bulunamadı', 'error');
      return;
    }

    const normalizedPin = signOutAllPin.trim();

    if (!normalizedPin || !/^\d{4}$/.test(normalizedPin)) {
      setSignOutAllError('PIN 4 haneli olmalıdır');
      return;
    }

    const expectedPin = currentUser?.applicationPin && /^\d{4}$/.test(currentUser.applicationPin)
      ? currentUser.applicationPin
      : '';

    if (!expectedPin) {
      setSignOutAllError('Önce profilinizden uygulama PIN’i belirleyin.');
      return;
    }

    if (normalizedPin !== expectedPin) {
      setSignOutAllError('Uygulama PIN\'i hatalı!');
      return;
    }

    setSignOutAllError('');
    setSigningOutAll(true);

    window.__manualLogoutInProgress = true;

    try {
      await window.supabase.auth.signOut({ scope: 'global' });

      closeSignOutAllModal();

      await logout({
        toastMessage: 'Tüm cihazlardan çıkış yapıldı',
        toastKind: 'success',
        redirect: '#/login'
      });
    } catch (error) {
      window.devError('Tüm cihazlardan çıkış yapılırken hata oluştu:', error);
      toast('Tüm cihazlardan çıkış yapılamadı', 'error');
    } finally {
      setSigningOutAll(false);
      if (window.__manualLogoutInProgress) {
        window.__manualLogoutInProgress = false;
      }
    }
  };

  const handleUserInfoSave = async (e) => {
    e.preventDefault();

    if (!currentUser?.uid) {
      toast('Kullanıcı oturumu bulunamadı', 'error');
      return;
    }

    if (!userInfoForm.firstName || !userInfoForm.lastName) {
      toast('İsim ve soyisim zorunludur', 'error');
      return;
    }

    if (!userInfoForm.applicationPin || !/^\d{4}$/.test(userInfoForm.applicationPin.trim())) {
      toast('Uygulama PIN\'i 4 haneli olmalıdır', 'error');
      return;
    }

    setSavingUserInfo(true);
    try {
      const trimmedFirstName = userInfoForm.firstName.trim();
      const trimmedLastName = userInfoForm.lastName.trim();
      const trimmedDepartment = userInfoForm.department?.trim() || null;
      const trimmedPosition = userInfoForm.position?.trim() || null;
      const normalizedPin = userInfoForm.applicationPin?.trim();
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
        department: trimmedDepartment || '',
        position: trimmedPosition || '',
        applicationPin
      };

      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
      window.dispatchEvent(new Event('user-info-updated'));
      toast('Bilgileriniz güncellendi', 'success');
      setShowUserInfoModal(false);
    } catch (error) {
      window.devError('Kullanıcı bilgileri güncellenirken hata oluştu:', error);
      toast('Kullanıcı bilgileri güncellenirken hata oluştu', 'error');
    } finally {
      setSavingUserInfo(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (!currentUser?.uid) {
      toast('Kullanıcı oturumu bulunamadı', 'error');
      return;
    }

    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      toast('Lütfen tüm şifre alanlarını doldurun', 'error');
      return;
    }

    if (passwordForm.new.length < 6) {
      toast('Yeni şifre en az 6 karakter olmalıdır', 'error');
      return;
    }

    if (passwordForm.new !== passwordForm.confirm) {
      toast('Yeni şifreler eşleşmiyor', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const session = await window.supabase.auth.getSession();
      if (!session.data?.session) {
        toast('Oturum bulunamadı. Lütfen tekrar giriş yapın.', 'error');
        setChangingPassword(false);
        return;
      }

      const verify = await window.supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: passwordForm.current,
      });
      if (verify.error) throw verify.error;

      const { error } = await window.supabase.auth.updateUser({ password: passwordForm.new });
      if (error) throw error;

      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      setCurrentUser(currentUser);
      window.dispatchEvent(new Event('user-info-updated'));
      toast('Şifreniz güncellendi', 'success');
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      window.devError('Şifre güncellenirken hata oluştu:', error);
      if (error.message?.toLowerCase().includes('invalid login credentials')) {
        toast('Mevcut şifreniz yanlış', 'error');
      } else if (error.message?.toLowerCase().includes('password')) {
        toast('Yeni şifre çok zayıf', 'error');
      } else {
        toast('Şifre güncellenirken hata oluştu', 'error');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    closeUserMenu();
    setShowSignOutAllModal(false);
    setSignOutAllPin('');
    setSignOutAllError('');
    try {
      await logout();
    } finally {
      setCurrentUser(getCurrentUser());
      window.dispatchEvent(new Event('user-info-updated'));
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
    closeUserMenu();
    setCurrentUser(getCurrentUser());
  }, [route]);

  // Hide sidebar on landing and login pages
  const hideSidebar = route === '/' || route === '/login' || route.startsWith('/login');

  // Logo click handler
  const handleLogoClick = () => {
    if (isLoggedIn && (currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'SuperAdmin' || isSuperAdmin())) {
      location.hash = '#/dashboard';
    } else {
      location.hash = '#/';
    }
  };

  const firstInitial = (value) => (value?.trim?.() ? value.trim()[0].toUpperCase() : '');
  const avatarInitials = (() => {
    if (!isLoggedIn) {
      return '?';
    }
    const initials = `${firstInitial(currentUser?.firstName)}${firstInitial(currentUser?.lastName)}`.trim();
    if (initials) {
      return initials;
    }
    if (currentUser?.email?.length) {
      return currentUser.email[0].toUpperCase();
    }
    return '?';
  })();

  const displayName = isLoggedIn
    ? [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim() || currentUser?.email || 'Kullanıcı'
    : 'Misafir Kullanıcı';

  const displayCompany = isLoggedIn
    ? (currentUser?.companyName || currentUser?.company?.trim() || 'Şirket bilgisi yok')
    : 'Oturum açılmadı';

  const renderUserMenuContent = () => (
    <>
      <div className="p-4 border-b border-gray-200">
        <div className="font-semibold text-dark-900">{displayName}</div>
        {currentUser?.email && (
          <div className="text-sm text-dark-500">{currentUser.email}</div>
        )}
        {currentUser?.position && (
          <div className="text-xs text-dark-400 mt-1">{currentUser.position}</div>
        )}
      </div>
      <div className="p-2 space-y-1">
        <button
          className="w-full text-left px-4 py-2 text-sm text-dark-600 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={openUserInfoModal}
        >
          👤 Kullanıcı Bilgileri
        </button>
        <button
          className="w-full text-left px-4 py-2 text-sm text-dark-600 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={openSignOutAllModal}
        >
          🔐 Tüm cihazlarda oturumu kapat
        </button>
        <button
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          onClick={handleLogout}
        >
          🚪 Çıkış Yap
        </button>
      </div>
    </>
  );

  return (
    <>
      <div
        className={'overlay ' + (open ? 'open' : '')}
        onClick={() => setOpen(false)}
      ></div>

      {!hideSidebar && (
        <div className={'sidebar ' + (open ? 'open' : '')}>
          <div className="sidebar-user-card">
            <div className="sidebar-user-card-inner">
              <button
                type="button"
                className="sidebar-user-button"
                onClick={() => {
                  if (isLoggedIn) {
                    toggleUserMenu('sidebar');
                  } else {
                    handleLogoClick();
                  }
                }}
              >
                <div className="sidebar-user-initials" aria-hidden="true">{avatarInitials}</div>
                <div className="sidebar-user-meta">
                  <div className="sidebar-user-name">{displayName}</div>
                  <div className="sidebar-user-company">{displayCompany}</div>
                </div>
                {isLoggedIn && (
                  <span
                    className={'sidebar-user-chevron' + (showUserMenu && userMenuAnchor === 'sidebar' ? ' open' : '')}
                    aria-hidden="true"
                  ></span>
                )}
              </button>
            </div>
            {isLoggedIn && showUserMenu && userMenuAnchor === 'sidebar' && (
              <>
                <div className="fixed inset-0 z-10" onClick={closeUserMenu}></div>
                <div className="sidebar-user-menu">{renderUserMenuContent()}</div>
              </>
            )}
          </div>

          {/* Super Admin: Company Switcher */}
          {isSuperAdmin() && (
            <div className="px-4 py-3 border-b border-gray-200">
              <label className="block text-xs font-semibold text-dark-500 mb-2 uppercase">Şirket Seçimi</label>
              <div className="relative">
                <button
                  type="button"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-dark-900 font-medium hover:bg-gray-50 transition-colors flex items-center justify-between"
                  onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                >
                  <span className="truncate">
                    {selectedCompany === 'all' ? '🌐 Tüm Şirketler' : (companies.find(c => (c._supabaseId || c.id) === selectedCompany)?.name || 'Şirket Seç')}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${showCompanyDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showCompanyDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowCompanyDropdown(false)}></div>
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      <button
                        type="button"
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${selectedCompany === 'all' ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-dark-900'}`}
                        onClick={() => handleCompanyChange('all')}
                      >
                        🌐 Tüm Şirketler
                      </button>
                      {companies.map(company => (
                        <button
                          key={company.id}
                          type="button"
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors border-t border-gray-100 ${selectedCompany === (company._supabaseId || company.id) ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-dark-900'}`}
                          onClick={() => handleCompanyChange(company._supabaseId || company.id)}
                        >
                          🏢 {company.name}
                        </button>
                      ))}
                      {companies.length === 0 && !companiesLoading && (
                        <div className="px-3 py-2 text-sm text-dark-400 text-center">
                          Henüz şirket yok
                        </div>
                      )}
                      {companiesLoading && (
                        <div className="px-3 py-2 text-sm text-dark-400 text-center">
                          Yükleniyor...
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <nav className="py-4">
            {/* Super Admin Only: Company Management */}
            {isSuperAdmin() && (
              <a href="#/company-management" className={isActive('/company-management') ? 'active' : ''}>
                <BuildingOfficeIcon size={20} strokeWidth={2} />
                <span>Şirket Yönetimi</span>
              </a>
            )}

            {/* Super Admin & Admin: See everything */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'SuperAdmin' || isSuperAdmin()) && (
              <>
                <a href="#/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
                  <ChartBarIcon size={20} strokeWidth={2} />
                  <span>Dashboard</span>
                </a>

                <a href="#/admin" className={isActive('/admin') ? 'active' : ''}>
                  <CogIcon size={20} strokeWidth={2} />
                  <span>Soru Havuzu</span>
                </a>

                <a href="#/questions" className={isActive('/questions') ? 'active' : ''}>
                  <QuestionMarkCircleIcon size={20} strokeWidth={2} />
                  <span>Sorular</span>
                </a>

                <a href="#/manager" className={isActive('/manager') ? 'active' : ''}>
                  <ClipboardIcon size={20} strokeWidth={2} />
                  <span>Yönetici Paneli</span>
                </a>

                <a href="#/tests" className={isActive('/tests') ? 'active' : ''}>
                  <DocumentTextIcon size={20} strokeWidth={2} />
                  <span>Testler</span>
                </a>

                <a href="#/suggest" className={isActive('/suggest') ? 'active' : ''}>
                  <LightBulbIcon size={20} strokeWidth={2} />
                  <span>Soru Öner</span>
                </a>

                <a href="#/suggestions" className={isActive('/suggestions') ? 'active' : ''} style={{ position: 'relative' }}>
                  <InformationCircleIcon size={20} strokeWidth={2} />
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
                  <SparklesIcon size={20} strokeWidth={2} />
                  <span>Marka Ayarları</span>
                </a>

                <a href="#/users" className={isActive('/users') ? 'active' : ''}>
                  <UsersIcon size={20} strokeWidth={2} />
                  <span>Kullanıcı Yönetimi</span>
                </a>
              </>
            )}

            {/* Manager: Dashboard, Manager Panel, Tests, Suggest */}
            {currentUser?.role === 'manager' && (
              <>
                <a href="#/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
                  <ChartBarIcon size={20} strokeWidth={2} />
                  <span>Dashboard</span>
                </a>

                <a href="#/manager" className={isActive('/manager') ? 'active' : ''}>
                  <ClipboardIcon size={20} strokeWidth={2} />
                  <span>Yönetici Paneli</span>
                </a>

                <a href="#/questions" className={isActive('/questions') ? 'active' : ''}>
                  <QuestionMarkCircleIcon size={20} strokeWidth={2} />
                  <span>Sorular</span>
                </a>

                <a href="#/tests" className={isActive('/tests') ? 'active' : ''}>
                  <DocumentTextIcon size={20} strokeWidth={2} />
                  <span>Testler</span>
                </a>

                <a href="#/suggest" className={isActive('/suggest') ? 'active' : ''}>
                  <LightBulbIcon size={20} strokeWidth={2} />
                  <span>Soru Öner</span>
                </a>
              </>
            )}

            {/* Tester: Tests and Suggest */}
            {currentUser?.role === 'tester' && (
              <>
                <a href="#/tests" className={isActive('/tests') ? 'active' : ''}>
                  <DocumentTextIcon size={20} strokeWidth={2} />
                  <span>Testler</span>
                </a>

                <a href="#/suggest" className={isActive('/suggest') ? 'active' : ''}>
                  <LightBulbIcon size={20} strokeWidth={2} />
                  <span>Soru Öner</span>
                </a>
              </>
            )}

            {/* Not logged in / Anonymous users */}
            {!isLoggedIn && (
              <>
                <a href="#/mytests" className={isActive('/mytests') ? 'active' : ''}>
                  <DocumentTextIcon size={20} strokeWidth={2} />
                  <span>Testlerim</span>
                </a>
                <a href="#/suggest" className={isActive('/suggest') ? 'active' : ''}>
                  <LightBulbIcon size={20} strokeWidth={2} />
                  <span>Soru Öner</span>
                </a>
              </>
            )}
          </nav>
        </div>
      )}

      {!hideSidebar && (
        <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 relative flex items-center justify-between">
            <div className="header-edge-left">
              <div
                className={'hamburger ' + (open ? 'open' : '')}
                onClick={() => setOpen(v => !v)}
              >
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            <div
              className="header-logo"
              onClick={handleLogoClick}
            >
              <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
                <img src="assets/logo.svg" alt="QuizUp+" style={{ width: '180px', height: 'auto' }} />
              </div>
            </div>

            <div className="header-actions">
              <div className="header-user-placeholder"></div>
              <div id="header-timer-slot" className="header-timer-slot" aria-live="polite"></div>
            </div>
          </div>
        </header>
      )}

      {showSignOutAllModal && (
        <>
          <div className="overlay open" onClick={closeSignOutAllModal} style={{ zIndex: 998 }}></div>
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
              maxWidth: '420px',
              width: '90%'
            }}
          >
            <form onSubmit={handleSignOutAllDevices} className="space-y-5">
              <div>
                <h3 className="text-xl font-semibold text-dark-900 mb-2">🔐 Tüm Cihazlarda Oturumu Kapat</h3>
                <p className="text-sm text-dark-600">
                  Bu işlem tüm cihazlarınızdaki oturumları sonlandırır. Devam etmek için uygulama PIN'inizi doğrulayın.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-700 mb-2">Uygulama PIN (4 Hane)</label>
                <input
                  type="password"
                  className="field"
                  inputMode="numeric"
                  maxLength={4}
                  value={signOutAllPin}
                  onChange={(e) => {
                    setSignOutAllPin(e.target.value);
                    setSignOutAllError('');
                  }}
                  autoFocus
                />
                {signOutAllError && (
                  <p className="text-xs text-red-500 mt-2">{signOutAllError}</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}
                  disabled={signingOutAll}
                >
                  {signingOutAll ? 'Oturumlar kapatılıyor...' : 'Tüm Oturumları Kapat'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost w-full"
                  onClick={closeSignOutAllModal}
                  disabled={signingOutAll}
                >
                  Vazgeç
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {showUserInfoModal && (
        <>
          <div className="overlay open" onClick={closeUserInfoModal} style={{ zIndex: 998 }}></div>
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
              <h2 className="text-2xl font-bold text-dark-900">👤 Kullanıcı Bilgileri</h2>
              <button
                className="text-dark-400 hover:text-dark-900 text-2xl"
                onClick={closeUserInfoModal}
              >
                ×
              </button>
            </div>

            {userInfoLoading ? (
              <LoadingSpinner text="Bilgiler yükleniyor..." />
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleUserInfoSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">İsim *</label>
                      <input
                        type="text"
                        className="field"
                        value={userInfoForm.firstName}
                        onChange={(e) => setUserInfoForm({ ...userInfoForm, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">Soyisim *</label>
                      <input
                        type="text"
                        className="field"
                        value={userInfoForm.lastName}
                        onChange={(e) => setUserInfoForm({ ...userInfoForm, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">Şirket</label>
                      <input
                        type="text"
                        className="field"
                        value={userInfoForm.company}
                        onChange={(e) => setUserInfoForm({ ...userInfoForm, company: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">Birim</label>
                      <input
                        type="text"
                        className="field"
                        value={userInfoForm.department}
                        onChange={(e) => setUserInfoForm({ ...userInfoForm, department: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-dark-700 mb-2">Görev</label>
                    <input
                      type="text"
                      className="field"
                      value={userInfoForm.position}
                      onChange={(e) => setUserInfoForm({ ...userInfoForm, position: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-dark-700 mb-2">Uygulama PIN (4 Hane)</label>
                    <input
                      type="text"
                      className="field"
                      inputMode="numeric"
                      maxLength={4}
                      value={userInfoForm.applicationPin}
                      onChange={(e) => setUserInfoForm({ ...userInfoForm, applicationPin: e.target.value })}
                    />
                    <p className="text-xs text-dark-500 mt-1">PIN yalnızca rakamlardan oluşmalıdır.</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      className="btn btn-ghost flex-1"
                      onClick={closeUserInfoModal}
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-1"
                      disabled={savingUserInfo}
                    >
                      {savingUserInfo ? 'Kaydediliyor...' : 'Bilgileri Kaydet'}
                    </button>
                  </div>
                </form>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-dark-900 mb-3">Şifre Değiştir</h3>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-dark-700 mb-2">Mevcut Şifre</label>
                      <input
                        type="password"
                        className="field"
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                        autoComplete="current-password"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-dark-700 mb-2">Yeni Şifre</label>
                        <input
                          type="password"
                          className="field"
                          value={passwordForm.new}
                          onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                          autoComplete="new-password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-dark-700 mb-2">Yeni Şifre (Tekrar)</label>
                        <input
                          type="password"
                          className="field"
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="btn btn-ghost flex-1"
                        onClick={() => setPasswordForm({ current: '', new: '', confirm: '' })}
                        disabled={changingPassword}
                      >
                        Temizle
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary flex-1"
                        disabled={changingPassword}
                      >
                        {changingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

window.Sidebar = Sidebar;
