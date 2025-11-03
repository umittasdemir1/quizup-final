const { useState, useEffect } = React;

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState(0);
  const route = useHash();
  const currentUser = getCurrentUser();
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

  const loadPendingCount = async () => {
    try {
      await waitFirebase();
      const { db, collection, getDocs, query, where } = window.firebase;
      const q = query(collection(db, 'suggestedQuestions'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      setPendingSuggestions(snapshot.size);
    } catch (e) {
      console.error('Load pending count error:', e);
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
                    <div className="p-2">
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
    </>
  );
};

window.Sidebar = Sidebar;
