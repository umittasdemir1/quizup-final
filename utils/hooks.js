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

// Animated placeholder hook
const useAnimatedPlaceholder = () => {
  const [placeholderWords, setPlaceholderWords] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load placeholder words from Firebase
  useEffect(() => {
    (async () => {
      try {
        await waitFirebase();
        const { db, doc, getDoc } = window.firebase;
        const settingsDoc = await getDoc(doc(db, 'settings', 'branding'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          const words = data?.searchPlaceholderWords || '';
          // Parse comma-separated values and trim whitespace
          const wordArray = words
            .split(',')
            .map(w => w.trim())
            .filter(w => w.length > 0);

          if (wordArray.length > 0) {
            setPlaceholderWords(wordArray);
          } else {
            // Default fallback
            setPlaceholderWords(['Soru ara...']);
          }
        } else {
          setPlaceholderWords(['Soru ara...']);
        }
      } catch (e) {
        console.error('Error loading placeholder words:', e);
        setPlaceholderWords(['Soru ara...']);
      }
    })();
  }, []);

  // Typewriter animation effect
  useEffect(() => {
    if (placeholderWords.length === 0) return;

    const currentWord = placeholderWords[wordIndex];
    const typingSpeed = 100; // ms per character when typing
    const deletingSpeed = 50; // ms per character when deleting
    const pauseAfterTyping = 2000; // ms pause after fully typing a word
    const pauseAfterDeleting = 500; // ms pause after fully deleting

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (charIndex < currentWord.length) {
          setCurrentText(currentWord.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          // Finished typing, pause then start deleting
          setTimeout(() => {
            setIsDeleting(true);
          }, pauseAfterTyping);
        }
      } else {
        // Deleting
        if (charIndex > 0) {
          setCurrentText(currentWord.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          // Finished deleting, move to next word
          setIsDeleting(false);
          setWordIndex((wordIndex + 1) % placeholderWords.length);
          setTimeout(() => {
            // Small pause before typing next word
          }, pauseAfterDeleting);
        }
      }
    }, isDeleting ? deletingSpeed : (charIndex === currentWord.length ? 0 : typingSpeed));

    return () => clearTimeout(timer);
  }, [placeholderWords, wordIndex, charIndex, isDeleting]);

  return currentText;
};

// Make available globally
window.useHash = useHash;
window.useAnon = useAnon;
window.useAnimatedPlaceholder = useAnimatedPlaceholder;
