const { useState, useEffect } = React;

const Landing = () => {
  return (
    <div className="bg-landing min-h-screen flex items-center justify-center relative">
      <div className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side */}
        <div className="space-y-6 flex flex-col items-center md:items-start text-center md:text-left">
          {/* QuizUp+ Logo */}
          <div className="hero-title flex items-center gap-4 mb-2">
            <div className="logo-icon" style={{ width: '64px', height: '64px' }}>
              <QuestionMarkCircleIcon size={40} strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <div className="display-small text-dark-900">QuizUp+</div>
              <div className="body-medium text-dark-600">Boost Your Knowledge</div>
            </div>
          </div>

          <h2 className="display-medium text-dark-900 hero-subtitle">
            Test. Learn.<br/>Level Up.
          </h2>

          <div className="flex gap-4 hero-btn">
            <button
              className="btn btn-primary px-8 py-4"
              onClick={() => location.hash = '#/login'}
            >
              Get Started
            </button>
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
    </div>
  );
};

window.Landing = Landing;
