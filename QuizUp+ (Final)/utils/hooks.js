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

// Anonymous auth hook
const useAnon = () => {
  useEffect(() => {
    (async () => {
      await waitFirebase();
      const { auth, signInAnonymously } = window.firebase;
      try {
        await signInAnonymously(auth);
      } catch(e) {
        console.error('Auth error:', e);
      }
    })();
  }, []);
};

// Make available globally
window.useHash = useHash;
window.useAnon = useAnon;
