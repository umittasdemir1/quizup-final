const ScrollToTop = () => {
  const { useState, useEffect } = React;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const toggleVisibility = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldShow = window.scrollY > 200 || window.pageYOffset > 200;
          setIsVisible(shouldShow);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });

    // Initial check
    toggleVisibility();

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('scrollToTop clicked!');

    // Multiple scroll methods for compatibility
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // TEST: Always show button
  // if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      onTouchStart={scrollToTop}
      className="scroll-to-top-btn"
      aria-label="Yukarı çık"
      type="button"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        width: '40px',
        height: '40px',
        background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.5), rgba(255, 69, 0, 0.5))',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(255, 87, 34, 0.3)',
        pointerEvents: 'auto'
      }}
    >
      <div className="arrow-up"></div>
    </button>
  );
};
