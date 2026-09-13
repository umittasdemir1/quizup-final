const ScrollToTop = () => {
  const { useState, useEffect } = React;
  const [isVisible, setIsVisible] = useState(false);
  const getScroller = () => document.querySelector('.quiz-content') || document.scrollingElement || document.documentElement;

  useEffect(() => {
    let frame = null;
    const update = () => {
      frame = null;
      const scroller = getScroller();
      const offset = scroller === document.scrollingElement || scroller === document.documentElement
        ? Math.max(window.scrollY, scroller.scrollTop) : scroller.scrollTop;
      setIsVisible(offset > 300);
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    schedule();
    return () => {
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!isVisible) return null;
  const scrollToTop = () => {
    const scroller = getScroller();
    const target = scroller === document.scrollingElement || scroller === document.documentElement ? window : scroller;
    const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    target.scrollTo({ top: 0, behavior });
  };
  return <button onClick={scrollToTop} className="scroll-to-top-btn" aria-label="Yukarı çık" title="Yukarı çık" type="button">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
  </button>;
};

window.ScrollToTop = ScrollToTop;
