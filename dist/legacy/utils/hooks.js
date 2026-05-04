(() => {
  const { useState, useEffect } = React;
  const useHash = () => {
    const [h, setH] = useState(location.hash || "#/");
    useEffect(() => {
      const on = () => {
        setH(location.hash || "#/");
      };
      addEventListener("hashchange", on);
      return () => removeEventListener("hashchange", on);
    }, []);
    return h.replace(/^#/, "");
  };
  const useAnon = () => {
    useEffect(() => {
      window.devLog("[useAnon] Auth is managed by the Supabase bridge");
    }, []);
  };
  const useAnimatedPlaceholder = () => {
    const [placeholderWords, setPlaceholderWords] = useState([]);
    const [currentText, setCurrentText] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    useEffect(() => {
      (async () => {
        var _a;
        try {
          let companyRef = null;
          try {
            const currentUser = getCurrentUser();
            companyRef = (currentUser == null ? void 0 : currentUser.companyId) || (currentUser == null ? void 0 : currentUser.company);
          } catch (err) {
            window.devWarn("Could not get user company for placeholder:", err);
          }
          if (companyRef && ((_a = window.db) == null ? void 0 : _a.getBranding)) {
            const brandingData = await window.db.getBranding(companyRef);
            if (brandingData) {
              const words = brandingData.searchPlaceholderWords || "";
              const wordArray = words.split(",").map((w) => w.trim()).filter((w) => w.length > 0);
              if (wordArray.length > 0) {
                setPlaceholderWords(wordArray);
                return;
              }
            }
          }
          setPlaceholderWords(["Soru ara..."]);
        } catch (e) {
          window.devError("Error loading placeholder words:", e);
          setPlaceholderWords(["Soru ara..."]);
        }
      })();
    }, []);
    useEffect(() => {
      if (placeholderWords.length === 0) return;
      const currentWord = placeholderWords[wordIndex];
      if (!currentWord) return;
      const typingSpeed = 100;
      const deletingSpeed = 50;
      const pauseAfterTyping = 2e3;
      const pauseAfterDeleting = 500;
      const timer = setTimeout(() => {
        if (!isDeleting) {
          if (charIndex < currentWord.length) {
            setCurrentText(currentWord.substring(0, charIndex + 1));
            setCharIndex(charIndex + 1);
          } else {
            setTimeout(() => {
              setIsDeleting(true);
            }, pauseAfterTyping);
          }
        } else {
          if (charIndex > 0) {
            setCurrentText(currentWord.substring(0, charIndex - 1));
            setCharIndex(charIndex - 1);
          } else {
            setIsDeleting(false);
            setWordIndex((wordIndex + 1) % placeholderWords.length);
            setTimeout(() => {
            }, pauseAfterDeleting);
          }
        }
      }, isDeleting ? deletingSpeed : charIndex === currentWord.length ? 0 : typingSpeed);
      return () => clearTimeout(timer);
    }, [placeholderWords, wordIndex, charIndex, isDeleting]);
    return currentText;
  };
  window.useHash = useHash;
  window.useAnon = useAnon;
  window.useAnimatedPlaceholder = useAnimatedPlaceholder;
})();
