const { useState, useEffect } = React;

// Hash routing hook
const useHash = () => {
  const [h, setH] = useState(location.hash || '#/');
  
  useEffect(() => {
    const on = () => setH(location.hash || '#/');
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  
  return h.replace(/^#/, '');
};

// Anonymous auth hook - Now handled by firebase.js, this is just a placeholder
// Kept for backward compatibility in case any component uses it
const useAnon = () => {
  useEffect(() => {
    // firebase.js now handles anonymous auth automatically
    // This hook is kept for backward compatibility but does nothing
    console.log('[useAnon] Auth is now managed by firebase.js');
  }, []);
};

// Make available globally
window.useHash = useHash;
window.useAnon = useAnon;
