const { useState } = React;

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast('Lütfen tüm alanları doldurun', 'error');
      return;
    }

    setLoading(true);
    try {
      await waitFirebase();
      const { auth, signInWithEmailAndPassword, db, doc, getDoc, updateDoc } = window.firebase;

      // Firebase Auth ile giriş
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestore'dan kullanıcı bilgilerini çek
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        toast('Kullanıcı bilgileri bulunamadı', 'error');
        await auth.signOut();
        return;
      }

      const userData = userDoc.data();

      // Use PIN from Firebase if it exists and is valid, otherwise default to '0000' locally only
      const applicationPin = userData.applicationPin && /^\d{4}$/.test(userData.applicationPin)
        ? userData.applicationPin
        : '0000';

      const normalizedUserData = {
        ...userData,
        company: userData.company || '',
        department: userData.department || '',
        position: userData.position || '',
        applicationPin
      };

      // LocalStorage'a kullanıcı bilgilerini kaydet
      localStorage.setItem('currentUser', JSON.stringify({
        uid: user.uid,
        email: user.email,
        ...normalizedUserData
      }));
      window.dispatchEvent(new Event('user-info-updated'));

      // Aktif oturum kaydı Firebase auth dinleyicisinde tetiklenir.
      // Burada çağrı yapmak yinelenen oturumlar oluşturduğundan kaldırıldı.

      toast('Giriş başarılı!', 'success');

      // Role göre yönlendirme
      setTimeout(() => {
        if (userData.role === 'admin') {
          location.hash = '#/dashboard';
        } else if (userData.role === 'manager') {
          location.hash = '#/dashboard';
        } else if (userData.role === 'tester') {
          location.hash = '#/tests';
        } else {
          location.hash = '#/dashboard';
        }
      }, 500);

    } catch (error) {
      window.devError('Login error:', error);

      if (error.code === 'auth/user-not-found') {
        toast('Kullanıcı bulunamadı', 'error');
      } else if (error.code === 'auth/wrong-password') {
        toast('Yanlış şifre', 'error');
      } else if (error.code === 'auth/invalid-email') {
        toast('Geçersiz email adresi', 'error');
      } else {
        toast('Giriş başarısız', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-landing min-h-screen flex items-center justify-center relative px-4">
      <div className="max-w-md w-full relative z-10">
        {/* Login Card */}
        <div className="card p-8 space-y-6">
          {/* QuizUp+ Logo */}
          <div className="flex justify-center mb-4">
            <img src="assets/logo.svg" alt="QuizUp+" style={{ width: '180px', height: 'auto' }} />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-dark-900 mb-2">Hoş Geldiniz</h1>
            <p className="text-dark-600">Devam etmek için giriş yapın</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Email
              </label>
              <input
                type="email"
                className="field"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Şifre
              </label>
              <input
                type="password"
                className="field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full text-lg py-3"
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          {/* Back to Landing */}
          <div className="text-center pt-4 border-t border-gray-200">
            <button
              className="text-sm text-dark-600 hover:text-primary-600 transition-colors"
              onClick={() => location.hash = '#/'}
            >
              ← Ana sayfaya dön
            </button>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary-500 rounded-full opacity-20 animate-bounce-soft"></div>
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-accent-500 rounded-full opacity-20 animate-bounce-soft" style={{ animationDelay: '0.3s' }}></div>
      </div>
    </div>
  );
};

window.Login = Login;
