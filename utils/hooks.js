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
    let unsubscribe;

    (async () => {
      await waitFirebase();
      const { auth, signInAnonymously, onAuthStateChanged } = window.firebase;

      console.log('[useAnon] Starting auth check...');

      // CRITICAL: Wait for Firebase Auth to restore session from persistence
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('[useAnon] Auth state changed. Firebase user:', firebaseUser?.email || firebaseUser?.uid || 'null');

        // If Firebase Auth has a non-anonymous user, do nothing
        if (firebaseUser && !firebaseUser.isAnonymous) {
          console.log('[useAnon] Firebase has logged in user, skipping anonymous auth');
          return;
        }

        // Check localStorage for logged in user
        const currentUser = getCurrentUser();
        if (currentUser && !currentUser.isAnonymous) {
          console.log('[useAnon] localStorage has logged in user, skipping anonymous auth:', currentUser.email);
          return;
        }

        // If Firebase has anonymous user already, don't create another
        if (firebaseUser && firebaseUser.isAnonymous) {
          console.log('[useAnon] Already signed in anonymously, skipping');
          return;
        }

        // Only sign in anonymously if truly no user exists
        try {
          console.log('[useAnon] No logged in user found, signing in anonymously...');
          await signInAnonymously(auth);
          console.log('[useAnon] Anonymous sign in successful');
        } catch(e) {
          console.error('[useAnon] Anonymous auth error:', e);
        }
      });
    })();

    // Cleanup
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
};

// Make available globally
window.useHash = useHash;
window.useAnon = useAnon;
