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

const UserRoundIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </svg>
);

const BriefcaseBusinessIcon = () => (
  <svg {...svgProps}>
    <path d="M12 12h.01" />
    <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <path d="M22 13a18.15 18.15 0 0 1-20 0" />
    <rect width="20" height="14" x="2" y="6" rx="2" />
  </svg>
);

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

const Signup = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    password: '',
    passwordConfirm: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim() || !form.companyName.trim() || !form.email.trim() || !form.password) {
      toast('Lütfen tüm alanları doldurun', 'error');
      return;
    }

    if (form.password.length < 6) {
      toast('Şifre en az 6 karakter olmalı', 'error');
      return;
    }

    if (form.password !== form.passwordConfirm) {
      toast('Şifreler eşleşmiyor', 'error');
      return;
    }

    setLoading(true);
    try {
      if (!window.db?.signUpAccount) {
        throw new Error('Kayıt servisi hazır değil');
      }

      await window.db.signUpAccount({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        companyName: form.companyName.trim()
      });

      // Kayıt başarılı → otomatik giriş yap
      const userData = await window.signInWithSupabase(form.email.trim().toLowerCase(), form.password);

      toast('Hesabınız oluşturuldu, hoş geldiniz!', 'success');

      setTimeout(() => {
        location.hash = userData?.role === 'tester' ? '#/tests' : '#/dashboard';
      }, 500);

    } catch (error) {
      window.devError('Signup error:', error);
      toast(error.message || 'Kayıt başarısız', 'error');
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
              className="btn btn-outline px-4 sm:px-6 py-2"
              onClick={() => location.hash = '#/login'}
            >
              Giriş Yap
            </button>
          </nav>
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full mx-auto py-12 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-dark-900 mb-2">Hesap Oluştur</h1>
            <p className="text-dark-600">Firmanız için ücretsiz hesabınızı oluşturun</p>
          </div>

          <form onSubmit={handleSignup} className="auth-form space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-2">Ad</label>
                <div className="field-with-icon">
                  <UserRoundIcon />
                  <input
                    type="text"
                    className="field"
                    value={form.firstName}
                    onChange={update('firstName')}
                    disabled={loading}
                  />
                </div>
              </div>
              <div>
                <label className="block mb-2">Soyad</label>
                <div className="field-with-icon">
                  <UserRoundIcon />
                  <input
                    type="text"
                    className="field"
                    value={form.lastName}
                    onChange={update('lastName')}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-2">Firma Adı</label>
              <div className="field-with-icon">
                <BriefcaseBusinessIcon />
                <input
                  type="text"
                  className="field"
                  value={form.companyName}
                  onChange={update('companyName')}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block mb-2">Email</label>
              <div className="field-with-icon">
                <MailIcon />
                <input
                  type="email"
                  className="field"
                  value={form.email}
                  onChange={update('email')}
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
                  value={form.password}
                  onChange={update('password')}
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

            <div>
              <label className="block mb-2">Şifre Tekrar</label>
              <div className="field-with-icon">
                <RectangleEllipsisIcon />
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  className="field"
                  value={form.passwordConfirm}
                  onChange={update('passwordConfirm')}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="field-toggle"
                  onClick={() => setShowPasswordConfirm((v) => !v)}
                  aria-label={showPasswordConfirm ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPasswordConfirm ? <EyeIcon /> : <EyeClosedIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full text-lg py-3"
              disabled={loading}
            >
              {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-dark-600">
            Zaten hesabın var mı?{' '}
            <button
              className="text-primary-600 font-semibold hover:underline"
              onClick={() => location.hash = '#/login'}
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

window.Signup = Signup;
