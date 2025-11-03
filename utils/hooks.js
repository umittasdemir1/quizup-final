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

// Anonymous auth hook - ONLY sign in anonymously if no user is logged in
const useAnon = () => {
  useEffect(() => {
    (async () => {
      await waitFirebase();
      const { auth, signInAnonymously, onAuthStateChanged } = window.firebase;

      // Check if there's already a user (admin/manager/tester or anonymous)
      const currentUser = getCurrentUser();
      if (currentUser && !currentUser.isAnonymous) {
        console.log('User already logged in (not anonymous), skipping anonymous auth:', currentUser.email);
        return;
      }

      // Also check Firebase Auth state
      if (auth.currentUser) {
        console.log('Firebase Auth user already exists:', auth.currentUser.email || 'anonymous');
        // If it's not anonymous, don't override
        if (!auth.currentUser.isAnonymous) {
          return;
        }
      }

      // Only sign in anonymously if no user exists
      try {
        console.log('No logged in user found, signing in anonymously...');
        await signInAnonymously(auth);
        console.log('Anonymous sign in successful');
      } catch(e) {
        console.error('Anonymous auth error:', e);
      }
    })();
  }, []);
};

// Make available globally
window.useHash = useHash;
window.useAnon = useAnon;
