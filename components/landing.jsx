const Landing = () => {
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
            <button
              className="btn btn-primary px-4 sm:px-6 py-2"
              onClick={() => location.hash = '#/signup'}
            >
              Kayıt Ol
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full mx-auto py-16 flex flex-col items-center text-center relative z-10">
          <h2 className="display-medium text-dark-900 hero-subtitle mb-4">
            Test Et. Öğren. Seviye Atla.
          </h2>

          <p className="body-large text-dark-600 mb-10 max-w-lg">
            Ekibiniz için modern quiz ve değerlendirme platformu. Saniyeler içinde başlayın.
          </p>

          <button
            className="btn btn-primary px-10 py-4"
            onClick={() => location.hash = '#/signup'}
          >
            Hemen Başla
          </button>
        </div>
      </div>
    </div>
  );
};

window.Landing = Landing;
