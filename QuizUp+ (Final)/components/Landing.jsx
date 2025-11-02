const { useState, useEffect } = React;

const Landing = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await waitFirebase();
      try {
        const { db, doc, getDoc } = window.firebase;
        const settingsDoc = await getDoc(doc(db, 'settings', 'branding'));
        if (settingsDoc.exists()) {
          setLogoUrl(settingsDoc.data()?.logoUrl || '');
        }
      } catch (e) {
        console.error('Logo load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="bg-landing min-h-screen flex items-center justify-center relative">
      <div className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side */}
        <div className="space-y-6 flex flex-col items-center md:items-start text-center md:text-left">
          {/* Customer Logo - Glassmorphism Card */}
          {!loading && logoUrl && (
            <div className="glass-brand-logo-card hero-title">
              <img src={logoUrl} alt="Brand Logo" />
            </div>
          )}
          
          <h2 className="text-4xl md:text-5xl font-bold text-dark-900 leading-tight hero-subtitle">
            Boost Your<br/>Knowledge.
          </h2>
          
          <p className="text-xl text-dark-600 hero-subtitle">
            Test. Learn. Level Up.
          </p>
          
          <div className="flex gap-4 hero-btn">
            <button 
              className="btn btn-primary text-lg px-8 py-4"
              onClick={() => location.hash = '#/admin'}
            >
              Get Started
            </button>
            <button 
              className="btn btn-secondary text-lg px-8 py-4"
              onClick={() => location.hash = '#/manager'}
            >
              Learn More
            </button>
          </div>
          
          <div className="flex gap-8 pt-6">
            <div>
              <div className="text-3xl font-bold text-primary-500">1000+</div>
              <div className="text-sm text-dark-600">Sorular</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-secondary-500">500+</div>
              <div className="text-sm text-dark-600">Kullanıcı</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent-500">95%</div>
              <div className="text-sm text-dark-600">Başarı Oranı</div>
            </div>
          </div>
        </div>
        
        {/* Right Side - Illustration */}
        <div className="hero-image relative">
          <div className="relative">
            {/* Browser Window Mock */}
            <div className="bg-white rounded-2xl shadow-2xl border-4 border-secondary-500 overflow-hidden">
              {/* Browser Header */}
              <div className="bg-secondary-500 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-secondary-200"></div>
                <div className="w-3 h-3 rounded-full bg-secondary-200"></div>
                <div className="w-3 h-3 rounded-full bg-secondary-200"></div>
                <div className="ml-auto">
                  <svg className="w-16 h-16" viewBox="0 0 100 100" fill="white">
                    <rect x="20" y="20" width="60" height="60" rx="8" fill="none" stroke="currentColor" strokeWidth="6"/>
                    <rect x="30" y="30" width="15" height="15" rx="2" fill="currentColor"/>
                    <rect x="55" y="30" width="15" height="15" rx="2" fill="currentColor"/>
                    <rect x="30" y="55" width="15" height="15" rx="2" fill="currentColor"/>
                    <rect x="55" y="55" width="15" height="15" rx="2" fill="currentColor"/>
                  </svg>
                </div>
              </div>
              
              {/* Content Area */}
              <div className="p-8 space-y-4">
                {/* Question Icon */}
                <div className="bg-secondary-100 w-20 h-20 rounded-2xl flex items-center justify-center">
                  <span className="text-4xl">?</span>
                </div>
                
                {/* Progress bars */}
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded-full w-full"></div>
                  <div className="h-3 bg-gray-200 rounded-full w-4/5"></div>
                  <div className="h-3 bg-gray-200 rounded-full w-3/4"></div>
                </div>
                
                {/* Check Icon */}
                <div className="flex justify-end">
                  <div className="w-12 h-12 rounded-full bg-accent-500 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">✓</span>
                  </div>
                </div>
                
                {/* Button Mock */}
                <div className="bg-accent-500 h-12 rounded-xl w-full"></div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary-500 rounded-full opacity-20 animate-bounce-soft"></div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-accent-500 rounded-full opacity-20 animate-bounce-soft" style={{ animationDelay: '0.3s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.Landing = Landing;
