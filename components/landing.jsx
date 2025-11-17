const { useState, useEffect } = React;

const Landing = () => {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoSettings, setDemoSettings] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [demoForm, setDemoForm] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Load demo settings and calculate time left
  useEffect(() => {
    const loadDemoSettings = async () => {
      try {
        await waitFirebase();
        const { db, doc, getDoc } = window.firebase;
        const settingsDoc = await getDoc(doc(db, 'settings', 'demoFeature'));

        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          setDemoSettings(settings);

          if (settings.enabled && settings.endDate) {
            const calculateTime = () => {
              const now = new Date();
              const end = new Date(settings.endDate);
              const diff = end - now;

              if (diff <= 0) {
                setTimeLeft('Sona erdi');
                return;
              }

              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              setTimeLeft(`${days} gün ${hours} saat`);
            };

            calculateTime();
            const interval = setInterval(calculateTime, 60000); // Update every minute
            return () => clearInterval(interval);
          }
        }
      } catch (error) {
        window.devError('Demo settings load error:', error);
      }
    };

    loadDemoSettings();
  }, []);

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validation
      if (!demoForm.fullName.trim() || !demoForm.companyName.trim() || !demoForm.email.trim() || !demoForm.password.trim()) {
        toast('Lütfen tüm alanları doldurun', 'error');
        return;
      }

      if (demoForm.password.length < 6) {
        toast('Şifre en az 6 karakter olmalı', 'error');
        return;
      }

      // Call cloud function
      const token = window.firebase.auth.currentUser?.getIdToken ?
        await window.firebase.auth.currentUser.getIdToken() : null;

      const response = await fetch('https://us-central1-retail-quiz-4bb8c.cloudfunctions.net/createDemoAccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          fullName: demoForm.fullName.trim(),
          companyName: demoForm.companyName.trim(),
          email: demoForm.email.trim().toLowerCase(),
          password: demoForm.password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Demo hesap oluşturulamadı');
      }

      toast('Demo hesap oluşturuldu! Giriş yapılıyor...', 'success');

      // Auto login
      const { signInWithEmailAndPassword } = window.firebase;
      await signInWithEmailAndPassword(
        window.firebase.auth,
        demoForm.email.trim().toLowerCase(),
        demoForm.password
      );

      // Redirect to dashboard
      setTimeout(() => {
        location.hash = '#/dashboard';
      }, 1000);

    } catch (error) {
      window.devError('Demo account creation error:', error);
      toast(error.message || 'Demo hesap oluşturulamadı', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isDemoAvailable = demoSettings?.enabled && new Date(demoSettings.endDate) > new Date();

  return (
    <div className="bg-landing min-h-screen flex items-center justify-center relative">
      <div className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side */}
        <div className="space-y-6 flex flex-col items-center md:items-start text-center md:text-left">
          {/* Logo */}
          <div className="flex justify-center md:justify-start mb-2">
            <img src="assets/logo.svg" alt="QuizUp+" style={{ width: '250px', height: 'auto' }} />
          </div>

          <h2 className="display-medium text-dark-900 hero-subtitle">
            Test. Learn.<br/>Level Up.
          </h2>

          <div className="flex flex-col gap-3 hero-btn w-full md:w-auto">
            <button
              className="btn btn-primary px-8 py-4"
              onClick={() => location.hash = '#/login'}
            >
              Get Started
            </button>

            {isDemoAvailable && (
              <>
                <button
                  className="btn btn-secondary px-8 py-4 flex items-center justify-center gap-2"
                  onClick={() => setShowDemoModal(true)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Demo Hesabı Oluştur
                </button>
                <div className="text-sm text-dark-600 flex items-center justify-center md:justify-start gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Demo talebi {timeLeft} sonra kapanacak
                </div>
              </>
            )}

            {!isDemoAvailable && demoSettings && (
              <div className="text-sm text-dark-600 flex flex-col items-center md:items-start gap-2">
                <div className="font-medium">Demo Dönemi Sona Erdi</div>
                <a
                  href="mailto:tasdemir_umit@hotmail.com?subject=QuizUp%2B%20Demo%20Talebi&body=Merhaba%2C%20QuizUp%2B%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum."
                  className="btn btn-outline px-6 py-2 text-sm"
                >
                  Bize Ulaşın
                </a>
              </div>
            )}
          </div>

          <div className="flex gap-8 pt-6">
            <div>
              <div className="headline-large text-primary-500">1000+</div>
              <div className="body-medium text-dark-600">Sorular</div>
            </div>
            <div>
              <div className="headline-large text-secondary-500">500+</div>
              <div className="body-medium text-dark-600">Kullanıcı</div>
            </div>
            <div>
              <div className="headline-large text-accent-500">95%</div>
              <div className="body-medium text-dark-600">Başarı Oranı</div>
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

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-dark-900">Demo Hesabı Oluştur</h3>
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-dark-600 hover:text-dark-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-4 bg-secondary-50 rounded-lg border border-secondary-200">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-secondary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-dark-700">
                  <div className="font-medium mb-1">Demo Hesap Özellikleri:</div>
                  <ul className="list-disc list-inside space-y-1 text-dark-600">
                    <li>7 gün süre</li>
                    <li>Maksimum 1 admin, 3 yönetici</li>
                    <li>Maksimum 25 soru</li>
                  </ul>
                </div>
              </div>
            </div>

            <form onSubmit={handleDemoSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  İsim Soyisim
                </label>
                <input
                  type="text"
                  value={demoForm.fullName}
                  onChange={(e) => setDemoForm({ ...demoForm, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  placeholder="Ahmet Yılmaz"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  Şirket Adı
                </label>
                <input
                  type="text"
                  value={demoForm.companyName}
                  onChange={(e) => setDemoForm({ ...demoForm, companyName: e.target.value })}
                  className="w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  placeholder="ABC Teknoloji"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  value={demoForm.email}
                  onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  placeholder="ahmet@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">
                  Şifre
                </label>
                <input
                  type="password"
                  value={demoForm.password}
                  onChange={(e) => setDemoForm({ ...demoForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  placeholder="En az 6 karakter"
                  minLength={6}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDemoModal(false)}
                  className="flex-1 px-4 py-3 border border-dark-300 rounded-lg hover:bg-dark-50 transition-colors"
                  disabled={submitting}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

window.Landing = Landing;
