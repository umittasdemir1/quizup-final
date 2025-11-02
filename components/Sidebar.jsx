const { useState, useEffect } = React;

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const route = useHash();
  
  const isActive = (path) => {
    if (path === '/') return route === '/';
    return route.startsWith(path);
  };
  
  useEffect(() => {
    if (open) {
      setOpen(false);
    }
  }, [route]);
  
  return (
    <>
      <div 
        className={'overlay ' + (open ? 'open' : '')} 
        onClick={() => setOpen(false)}
      ></div>
      
      <div className={'sidebar ' + (open ? 'open' : '')}>
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="logo-icon">?</div>
            <div>
              <div className="text-xl font-bold text-white">QuizUp+</div>
              <div className="text-xs text-dark-300">Boost Your Knowledge</div>
            </div>
          </div>
        </div>
        
        <nav className="py-4">
          <a 
            href="#/" 
            className={isActive('/') && !isActive('/admin') && !isActive('/manager') && !isActive('/tests') && !isActive('/dashboard') && !isActive('/branding') ? 'active' : ''}
          >
            <span>🏠</span>
            <span>Ana Sayfa</span>
          </a>
          
          <a href="#/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            <span>📈</span>
            <span>Dashboard</span>
          </a>
          
          <a href="#/admin" className={isActive('/admin') ? 'active' : ''}>
            <span>⚙️</span>
            <span>Admin Panel</span>
          </a>
          
          <a href="#/manager" className={isActive('/manager') ? 'active' : ''}>
            <span>📊</span>
            <span>Manager Panel</span>
          </a>
          
          <a href="#/tests" className={isActive('/tests') ? 'active' : ''}>
            <span>📝</span>
            <span>Testler</span>
          </a>
          
          <a href="#/branding" className={isActive('/branding') ? 'active' : ''}>
            <span>🎨</span>
            <span>Marka Ayarları</span>
          </a>
        </nav>
      </div>
      
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className={'hamburger ' + (open ? 'open' : '')} 
            onClick={() => setOpen(v => !v)}
          >
            <span></span>
            <span></span>
            <span></span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="logo-icon">?</div>
            <span className="font-bold text-xl text-dark-900">QuizUp+</span>
          </div>
          
          <div className="w-8"></div>
        </div>
      </header>
    </>
  );
};

window.Sidebar = Sidebar;
