const { useState } = React;

const svgProps = {
  className: 'field-icon',
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
};

const MailIcon = () => (
  <svg {...svgProps}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const RectangleEllipsisIcon = () => (
  <svg {...svgProps}>
    <rect width="20" height="12" x="2" y="6" rx="2" />
    <path d="M12 12h.01" />
    <path d="M17 12h.01" />
    <path d="M7 12h.01" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg {...svgProps} className="">
    <path d="m15 18-.722-3.25" />
    <path d="M2 8a10.645 10.645 0 0 0 20 0" />
    <path d="m20 15-1.726-2.05" />
    <path d="m4 15 1.726-2.05" />
    <path d="m9 18 .722-3.25" />
  </svg>
);

const EyeIcon = () => (
  <svg {...svgProps} className="">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast('Lütfen tüm alanları doldurun', 'error');
      return;
    }

    setLoading(true);
    try {
      if (!window.signInWithSupabase) {
        throw new Error('Supabase auth hazır değil');
      }

      const userData = await window.signInWithSupabase(email.trim().toLowerCase(), password);

      if (!userData) {
        toast('Kullanıcı bilgileri bulunamadı', 'error');
        return;
      }

      toast('Giriş başarılı!', 'success');

      // Role göre yönlendirme
      setTimeout(() => {
        if (userData.role === 'tester') {
          location.hash = '#/tests';
        } else {
          location.hash = '#/dashboard';
        }
      }, 500);

    } catch (error) {
      window.devError('Login error:', error);

      if (error.message?.toLowerCase().includes('invalid login credentials')) {
        toast('Email veya şifre hatalı', 'error');
      } else if (error.message?.toLowerCase().includes('email')) {
        toast('Geçersiz email adresi', 'error');
      } else {
        toast('Giriş başarısız', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-landing min-h-screen flex flex-col relative">
      {/* Header */}
      <header className="w-full relative z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <img
            src="assets/logo.svg"
            alt="QuizUp+"
            style={{ width: '150px', height: 'auto' }}
            className="cursor-pointer"
            onClick={() => location.hash = '#/'}
          />
          <nav className="flex items-center gap-2 sm:gap-3">
            <button
              className="btn btn-primary px-4 sm:px-6 py-2"
              onClick={() => location.hash = '#/signup'}
            >
              Kayıt Ol
            </button>
          </nav>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full mx-auto py-12 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-dark-900 mb-2">Hoş Geldiniz</h1>
            <p className="text-dark-600">Devam etmek için giriş yapın</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form space-y-5">
            <div>
              <label className="block mb-2">Email</label>
              <div className="field-with-icon">
                <MailIcon />
                <input
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block mb-2">Şifre</label>
              <div className="field-with-icon">
                <RectangleEllipsisIcon />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="field-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPassword ? <EyeIcon /> : <EyeClosedIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full text-lg py-3"
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-dark-600">
            Hesabın yok mu?{' '}
            <button
              className="text-primary-600 font-semibold hover:underline"
              onClick={() => location.hash = '#/signup'}
            >
              Kayıt Ol
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.Login = Login;
