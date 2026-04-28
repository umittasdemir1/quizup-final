const { Component } = React;

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    window.devError('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log to analytics if available
    if (window.logError) {
      window.logError({
        error: error.toString(),
        errorInfo: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }

    // Show toast notification
    if (window.toast) {
      window.toast('Bir hata oluştu. Sayfa yenileniyor...', 'error', 5000);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
          <div className="max-w-2xl w-full">
            <div className="card p-8 text-center">
              {/* Error Icon */}
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-dark-900 mb-4">
                Bir Hata Oluştu
              </h1>

              {/* Description */}
              <p className="text-dark-600 mb-6">
                Üzgünüz, beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya ana sayfaya dönün.
              </p>

              {/* Error Details (only in development) */}
              {window.location.hostname === 'localhost' && this.state.error && (
                <details className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                  <summary className="cursor-pointer font-semibold text-dark-700 mb-2">
                    Hata Detayları (Geliştirici Modu)
                  </summary>
                  <div className="text-sm text-red-600 font-mono break-words">
                    <p className="mb-2"><strong>Hata:</strong> {this.state.error.toString()}</p>
                    {this.state.errorInfo && (
                      <pre className="bg-white p-3 rounded overflow-auto max-h-48 text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  className="btn btn-primary"
                  onClick={this.handleReload}
                >
                  🔄 Sayfayı Yenile
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={this.handleGoHome}
                >
                  🏠 Ana Sayfaya Dön
                </button>
              </div>

              {/* Support Info */}
              <p className="text-sm text-dark-500 mt-6">
                Sorun devam ederse, lütfen sistem yöneticinizle iletişime geçin.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Make it available globally
window.ErrorBoundary = ErrorBoundary;
