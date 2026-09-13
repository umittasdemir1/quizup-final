const { useState, useEffect } = React;

// Hash routing hook
const useHash = () => {
  const [h, setH] = useState(location.hash || '#/');

  useEffect(() => {
    const on = () => {
      setH(location.hash || '#/');
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);

  return h.replace(/^#/, '');
};

// Anonymous auth hook - auth is handled by the Supabase bridge; this is a placeholder
// Kept for backward compatibility in case any component uses it
const useAnon = () => {
  useEffect(() => {
    // This hook is kept for backward compatibility but does nothing
    window.devLog('[useAnon] Auth is managed by the Supabase bridge');
  }, []);
};

// Animated placeholder hook
const useAnimatedPlaceholder = () => {
  const [placeholderWords, setPlaceholderWords] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refresh branding in place without reloading the page.
  useEffect(() => {
    let active = true;
    let version = 0;
    const loadWords = async () => {
      const request = ++version;
      let words = ['Soru ara...'];
      try {
        const user = getCurrentUser();
        const company = user?.companyId || user?.company;
        if (company && window.db?.getBranding) {
          const data = await window.db.getBranding(company);
          const custom = (data?.searchPlaceholderWords || '').split(',').map(w => w.trim()).filter(Boolean);
          if (custom.length) words = custom;
        }
      } catch (error) {
        window.devError('Error loading placeholder words:', error);
      }
      if (!active || request !== version) return;
      setPlaceholderWords(words);
      setWordIndex(0);
      setCharIndex(0);
      setIsDeleting(false);
      setCurrentText('');
    };
    loadWords();
    window.addEventListener('branding-updated', loadWords);
    return () => {
      active = false;
      window.removeEventListener('branding-updated', loadWords);
    };
  }, []);

  // Typewriter animation effect
  useEffect(() => {
    if (placeholderWords.length === 0) return;

    const currentWord = placeholderWords[wordIndex];
    if (!currentWord) return; // Safety check

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
