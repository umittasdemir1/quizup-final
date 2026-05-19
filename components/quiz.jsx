const { useState, useEffect, useRef, useCallback, memo } = React;

// Get or create anonymous user ID
const getAnonymousId = () => {
  let anonId = localStorage.getItem('anonUserId');
  if (!anonId) {
    anonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('anonUserId', anonId);
  }
  return anonId;
};

// 🚀 Performance: Memoize CircularTimer component to prevent unnecessary re-renders
const CircularTimer = memo(({ timeLeft, totalSeconds, isActive }) => {
  if (!totalSeconds || totalSeconds <= 0) {
    return null;
  }

  const safeTime = Math.max(0, timeLeft ?? totalSeconds);
  const progress = Math.max(0, Math.min(1, safeTime / totalSeconds));
  const strokeWidth = 4;
  const size = 40;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  let ringColor = '#3DA89C';
  if (progress <= 0.25) {
    ringColor = '#DC2626';
  } else if (progress <= 0.5) {
    ringColor = '#FF8C00';
  } else if (progress <= 0.75) {
    ringColor = '#FFD700';
  }

  const showEndingAnimation = safeTime <= 5 && isActive;

  return (
    <div className="circular-timer" role="timer" aria-label={`Kalan süre: ${safeTime} saniye`}>
      <svg
        className="circular-timer-ring"
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className="circular-timer-ring-bg"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className="circular-timer-ring-progress"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          style={{
            filter: `drop-shadow(0 0 12px ${ringColor}40)`,
          }}
        />
      </svg>
      <div className={`circular-timer-value ${showEndingAnimation ? 'ending' : ''}`}>
        {safeTime}
      </div>
    </div>
  );
});

const Quiz = ({ sessionId }) => {
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timedOutQuestions, setTimedOutQuestions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [timerTotal, setTimerTotal] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);
  const cardRef = useRef(null);
  const revealTimerRef = useRef(null);

  const [showAnswer, setShowAnswer] = useState(false);

  // Açık oturum katılımcı bilgileri
  const [participantInfo, setParticipantInfo] = useState(null);
  const [participantForm, setParticipantForm] = useState({ fullName: '', store: '' });
  const [participantErrors, setParticipantErrors] = useState({});
  const [joiningLobby, setJoiningLobby] = useState(false);

  // Lobi
  const [lobbyParticipants, setLobbyParticipants] = useState([]);
  const [lobbyTimeLeft, setLobbyTimeLeft] = useState(null);
  const [lobbyStartedAt, setLobbyStartedAt] = useState(null);
  const [countdown, setCountdown] = useState(null); // 3,2,1 geri sayım
  const [quizStarted, setQuizStarted] = useState(false);
  const lobbyIntervalRef = useRef(null);
  const countdownRef = useRef(null);

  // Toplam süre sayacı
  const [sessionTimeLeft, setSessionTimeLeft] = useState(null);
  const [sessionTimerExpired, setSessionTimerExpired] = useState(false);
  const sessionTimerRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return getCurrentUser();
    } catch {
      return null;
    }
  });
  const [sessionOwnerPin, setSessionOwnerPin] = useState(null);
  
  // ⏱️ Time Tracking States
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [questionTimes, setQuestionTimes] = useState({});
  
  // 📍 Location State
  const [userLocation, setUserLocation] = useState(null);

  // 🚪 Abandon Quiz State
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  // 🔒 PIN Lock State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [skipConfirmAction, setSkipConfirmAction] = useState(null);

  useEffect(() => {
    const syncUser = () => {
      try {
        setCurrentUser(getCurrentUser());
      } catch (err) {
        window.devWarn('Quiz sayfasında kullanıcı bilgisi yenilenemedi:', err);
      }
    };

    window.addEventListener('user-info-updated', syncUser);
    window.addEventListener('quizup-auth-state', syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('user-info-updated', syncUser);
      window.removeEventListener('quizup-auth-state', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const refreshActiveUser = useCallback(async () => {
    try {
      const authUser = window.__quizupCurrentAuthUser;
      if (!authUser?.uid || authUser.isAnonymous) return;

      const fresh = await window.loadCurrentSupabaseUser();
      if (!fresh) return;

      try {
        localStorage.setItem('currentUser', JSON.stringify(fresh));
      } catch (storageErr) {
        window.devWarn('Quiz sayfasında kullanıcı bilgisi yerelde saklanamadı:', storageErr);
      }

      setCurrentUser(fresh);
    } catch (err) {
      window.devWarn('Quiz sayfasında kullanıcı bilgisi güncellenemedi:', err);
    }
  }, []);

  const refreshSessionOwnerPin = useCallback(async () => {
    if (!sessionId) return;

    try {
      const s = await window.db.getSessionById(sessionId);
      if (!s) return;
      if (typeof s.createdByApplicationPin === 'string' && /^\d{4}$/.test(s.createdByApplicationPin)) {
        setSessionOwnerPin(s.createdByApplicationPin);
      } else {
        setSessionOwnerPin(null);
      }
    } catch (err) {
      window.devWarn('Quiz oturum PIN bilgisi yenilenemedi:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    refreshActiveUser();
  }, [refreshActiveUser]);

  useEffect(() => {
    if (showPasswordModal) {
      refreshActiveUser();
      refreshSessionOwnerPin();
    }
  }, [showPasswordModal, refreshActiveUser, refreshSessionOwnerPin]);

  useEffect(() => {
    (async () => {
      setSessionOwnerPin(null);
      try {
        const sd = await window.db.getSessionById(sessionId);
        if (!sd) {
          setLoading(false);
          toast('Oturum bulunamadı', 'error');
          return;
        }
        setSession(sd);
        if (typeof sd.createdByApplicationPin === 'string' && /^\d{4}$/.test(sd.createdByApplicationPin)) {
          setSessionOwnerPin(sd.createdByApplicationPin);
        } else {
          setSessionOwnerPin(null);
        }
        const qs = await window.db.getQuestionsByIds(sd.questionIds || []);
        setQuestions(qs.filter(Boolean));

        setQuizStartTime(Date.now());

        // Toplam süre modunda sayacı başlat (açık oturumda katılımcı kaydından sonra başlar)
        if (sd.timerMode === 'total' && sd.totalTimerSeconds && sd.sessionMode !== 'open') {
          setSessionTimeLeft(sd.totalTimerSeconds);
        }

        if (window.locationUtils) {
          window.locationUtils.getLocation().then(loc => {
            window.devLog('Location obtained:', loc);
            setUserLocation(loc);
          }).catch(err => {
            window.devError('Location error:', err);
          });
        }
      } catch(e) {
        window.devError('Quiz load error:', e);
        toast('Quiz yüklenirken hata oluştu', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  // Lobi: lobbyStartedAt değişince sayacı yeniden hesapla
  useEffect(() => {
    if (!lobbyStartedAt) return;

    const LOBBY_DURATION = 60;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(lobbyStartedAt).getTime()) / 1000);
      const left = Math.max(0, LOBBY_DURATION - elapsed);
      setLobbyTimeLeft(left);

      if (left <= 0) {
        clearInterval(lobbyIntervalRef.current);
        // 3-2-1 geri sayım
        let c = 3;
        setCountdown(c);
        countdownRef.current = setInterval(() => {
          c -= 1;
          if (c <= 0) {
            clearInterval(countdownRef.current);
            setCountdown(null);
            setQuizStarted(true);
          } else {
            setCountdown(c);
          }
        }, 1000);
      }
    };

    tick();
    lobbyIntervalRef.current = setInterval(tick, 1000);
    return () => {
      clearInterval(lobbyIntervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [lobbyStartedAt]);

  // Lobi: katılımcıları ve güncel lobbyStartedAt'ı izle
  useEffect(() => {
    if (!participantInfo || !session || session.sessionMode !== 'open') return;

    const unsubParticipants = window.db.onSessionParticipantsSnapshot(sessionId, (data) => {
      setLobbyParticipants(data);
    });

    // lobbyStartedAt'ı session'dan düzenli oku (yokken biri ilk katıldığında set edilir)
    let sessionPollTimer;
    const pollSession = async () => {
      try {
        const fresh = await window.db.getSessionById(sessionId);
        if (fresh?.lobbyStartedAt && !lobbyStartedAt) {
          setLobbyStartedAt(fresh.lobbyStartedAt);
        }
      } catch (e) { /* sessiz */ }
      sessionPollTimer = setTimeout(pollSession, 2000);
    };
    pollSession();

    return () => {
      unsubParticipants();
      clearTimeout(sessionPollTimer);
    };
  }, [participantInfo, sessionId]);

  const setAns = (qid, val) => {
    if (timedOutQuestions[qid]) {
      return;
    }
    setAnswers(a => ({ ...a, [qid]: val }));
  };

  useEffect(() => {
    setTimedOutQuestions({});
  }, [sessionId]);

  useEffect(() => {
    setShowSkipConfirm(false);
    setShowAnswer(false);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
  }, [idx]);

  // 📜 Scroll to top when question changes - Optimized for mobile
  useEffect(() => {
    // Instant scroll to top without smooth behavior for better mobile performance
    window.scrollTo(0, 0);

    // Also scroll the main element if it exists
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTop = 0;
    }
  }, [idx]);

  // ⏱️ Start timer for current question
  useEffect(() => {
    if (questions.length > 0 && questions[idx]) {
      const currentQ = questions[idx];
      
      // Record start time for this question
      setQuestionStartTime(Date.now());
      
      // Total timer modunda soru başına sayaç kullanılmaz
      if (session?.timerMode !== 'total' && currentQ.hasTimer && currentQ.timerSeconds) {
        setTimeLeft(currentQ.timerSeconds);
        setTimerTotal(currentQ.timerSeconds);
        setTimerActive(true);
      } else {
        setTimeLeft(null);
        setTimerTotal(null);
        setTimerActive(false);
      }
    }
  }, [idx, questions]);

  // Timer countdown with animations
  useEffect(() => {
    if (timerActive && timeLeft !== null && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setTimerActive(false);
            
            // 🎬 SHAKE + FLASH ANIMATION
            if (cardRef.current) {
              cardRef.current.classList.add('shake');
              setTimeout(() => {
                cardRef.current.classList.add('red-flash');
              }, 100);
              
              setTimeout(() => {
                cardRef.current.classList.remove('shake', 'red-flash');
              }, 600);
            }
            
            // 🔔 TOAST NOTIFICATION
            const questionId = questions[idx].id;

            setTimedOutQuestions(prev => ({
              ...prev,
              [questionId]: true
            }));

            // Record timeout (always mark as timeout regardless of selection)
            recordQuestionTime(questionId, 'timeout');
            
            // Clear the answer if it was selected but not confirmed
            setAnswers(prev => {
              const newAnswers = { ...prev };
              delete newAnswers[questionId];
              return newAnswers;
            });
            
            // 🔀 AUTO NEXT OR SUBMIT
            setTimeout(() => {
              if (idx < questions.length - 1) {
                setIdx(i => i + 1);
              } else {
                // Son soruda süre bitti - otomatik test sonlandır
                setTimeout(() => {
                  submit(true, true); // skip confirmation, mark as timeout
                }, 200);
              }
            }, 800);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timeLeft, idx, questions.length, answers]);

  // Toplam süre sayacı — sadece sayar, submit'i flag ile tetikler
  useEffect(() => {
    if (sessionTimeLeft === null || sessionTimeLeft <= 0) return;
    sessionTimerRef.current = setInterval(() => {
      setSessionTimeLeft(t => {
        if (t <= 1) {
          clearInterval(sessionTimerRef.current);
          setSessionTimerExpired(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(sessionTimerRef.current);
  }, [sessionTimeLeft !== null && sessionTimeLeft > 0 ? 1 : 0]);

  // Flag set edilince fresh closure'la submit çağır
  useEffect(() => {
    if (!sessionTimerExpired) return;
    setSessionTimerExpired(false);
    submit(true, true);
  }, [sessionTimerExpired]);

  // ⏱️ Record time spent on question
  const recordQuestionTime = (questionId, status = null) => {
    if (questionStartTime) {
      const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
      const finalStatus = status
        || (timedOutQuestions[questionId]
          ? 'timeout'
          : (answers[questionId] ? 'answered' : 'skipped'));
      setQuestionTimes(prev => ({
        ...prev,
        [questionId]: {
          timeSpent,
          status: finalStatus,
          timestamp: Date.now()
        }
      }));
    }
  };

  const advanceToNextQuestion = (statusOverride = null) => {
    if (idx >= questions.length - 1) return;

    const questionId = questions[idx].id;
    const wasTimedOut = timedOutQuestions[questionId];
    const hasAnswer = answers[questionId] != null && answers[questionId] !== '';
    const status = statusOverride || (wasTimedOut
      ? 'timeout'
      : (hasAnswer ? 'answered' : 'skipped'));

    recordQuestionTime(questionId, status);
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setIdx(i => i + 1);
  };

  const next = () => {
    if (idx < questions.length - 1) {
      const questionId = questions[idx].id;
      const wasTimedOut = timedOutQuestions[questionId];
      const hasAnswer = answers[questionId] != null && answers[questionId] !== '';

      if (!wasTimedOut && !hasAnswer) {
        setSkipConfirmAction('next');
        setShowSkipConfirm(true);
        return;
      }

      // MCQ ve cevap varsa cevabı göster
      if (questions[idx].type === 'mcq' && hasAnswer && !showAnswer) {
        setShowAnswer(true);
        setTimerActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
        // Doğru cevapsa 1sn sonra otomatik geç
        if (answers[questionId] === questions[idx].correctAnswer) {
          revealTimerRef.current = setTimeout(() => {
            advanceToNextQuestion();
          }, 1000);
        }
        return;
      }

      advanceToNextQuestion();
    }
  };

  const prev = () => {
    // Check if user already answered current question or moved forward
    const hasAnsweredCurrent = answers[questions[idx].id] != null;
    
    // If current question was answered or skipped, require application PIN
    if (hasAnsweredCurrent || idx > 0) {
      setShowPasswordModal(true);
      return;
    }
    
    // Otherwise allow free prev (shouldn't normally happen)
    goToPrevQuestion();
  };
  
  const goToPrevQuestion = () => {
    if (idx > 0) {
      const questionId = questions[idx].id;
      const wasTimedOut = timedOutQuestions[questionId];
      const hasAnswer = answers[questionId] != null && answers[questionId] !== '';
      const status = wasTimedOut
        ? 'timeout'
        : (hasAnswer ? 'answered' : 'skipped');

      recordQuestionTime(questionId, status);
      setTimerActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setIdx(i => i - 1);
      setShowPasswordModal(false);
      setPin('');
      setPinError('');
    }
  };
  
  const handlePinSubmit = () => {
    const expectedPin = sessionOwnerPin && /^\d{4}$/.test(sessionOwnerPin)
      ? sessionOwnerPin
      : '';

    if (!expectedPin) {
      setPinError('Bu oturum için uygulama PIN’i tanımlı değil.');
      setTimeout(() => setPinError(''), 2500);
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setPinError('PIN 4 haneli olmalıdır!');
      setTimeout(() => setPinError(''), 2000);
      return;
    }

    if (pin === expectedPin) {
      goToPrevQuestion();
    } else {
      setPinError('Uygulama PIN\'i hatalı!');
      setTimeout(() => setPinError(''), 2000);
    }
  };

  const handleAbandonQuiz = async () => {
    setShowAbandonModal(false);
    setSubmitting(true);

    try {
      const ownerUid = window.__quizupCurrentAuthUser?.uid || getAnonymousId();
      const companyId = session.companyId;

      const resultData = {
        ownerUid,
        ownerType: window.__quizupCurrentAuthUser?.isAnonymous === false ? 'authenticated' : 'anonymous',
        sessionId,
        employee: session.employee || {},
        answers: answers || {},
        score: { correct: 0, total: questions.length, percent: 0, status: 'abandoned' },
        timeTracking: {
          totalTime: quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0,
          questionTimes: []
        },
        location: userLocation || null,
        submittedAt: new Date().toISOString(),
      };

      await window.db.addResult(resultData, companyId);
      await window.db.updateSession(sessionId, { status: 'cancelled' });
      toast('Quiz terk edildi olarak kaydedildi', 'warning');

      setTimeout(() => {
        location.hash = '#/';
      }, 1500);
    } catch (e) {
      window.devError('Abandon quiz error:', e);
      toast('Hata oluştu', 'error');
      setSubmitting(false);
    }
  };

  const confirmSkip = () => {
    const action = skipConfirmAction;
    setShowSkipConfirm(false);
    setSkipConfirmAction(null);

    if (action === 'submit') {
      submit(true);
      return;
    }

    advanceToNextQuestion('skipped');
  };

  const cancelSkip = () => {
    setShowSkipConfirm(false);
    setSkipConfirmAction(null);
  };

  const submit = async (skipConfirm = false, isLastQuestionTimeout = false) => {
    // Determine last question status before recording
    const currentQuestionId = questions[idx].id;
    const lastQuestionAnswer = answers[currentQuestionId];
    const lastQuestionAnswered = lastQuestionAnswer != null && lastQuestionAnswer !== '';
    const lastQuestionTimedOut = isLastQuestionTimeout || timedOutQuestions[currentQuestionId];

    if (!skipConfirm && !lastQuestionTimedOut && !lastQuestionAnswered) {
      setSkipConfirmAction('submit');
      setShowSkipConfirm(true);
      return;
    }

    if (!skipConfirm && !confirm('Quizi göndermek istediğinizden emin misiniz?')) return;

    const lastQuestionStatus = lastQuestionTimedOut ? 'timeout' : (lastQuestionAnswered ? 'answered' : 'skipped');
    const lastQuestionTimeSpent = questionStartTime
      ? Math.round((Date.now() - questionStartTime) / 1000)
      : 0;
    
    // Record time for last question
    recordQuestionTime(currentQuestionId, lastQuestionStatus);

    setSubmitting(true);
    try {
      let correct = 0;
      questions.forEach(q => {
        if (q.type === 'mcq' && !timedOutQuestions[q.id] && answers[q.id] === q.correctAnswer) correct++;
      });

      // ⏱️ Calculate total time
      const totalTime = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;
      const averageTimePerQuestion = totalTime > 0 ? Math.round(totalTime / questions.length) : 0;

      // ⏱️ Prepare question times array - fix last question status
      const questionTimesArray = questions.map(q => {
        // Use the just-determined status for the last question
        const isLastQuestion = q.id === currentQuestionId;
        const questionAnswer = answers[q.id];
        const hasAnswer = questionAnswer != null && questionAnswer !== '';
        const wasTimedOut = timedOutQuestions[q.id];

        return {
          questionId: q.id,
          questionText: q.questionText,
          category: q.category,
          timeSpent: isLastQuestion ? lastQuestionTimeSpent : (questionTimes[q.id]?.timeSpent || 0),
          status: wasTimedOut
            ? 'timeout'
            : (isLastQuestion
              ? lastQuestionStatus
              : (questionTimes[q.id]?.status || (hasAnswer ? 'answered' : 'skipped'))),
          answered: wasTimedOut ? null : (questionAnswer || null),
          correct: q.type === 'mcq'
            ? (!wasTimedOut && questionAnswer === q.correctAnswer)
            : null
        };
      });

      const timeoutCount = questionTimesArray.filter(item => item.status === 'timeout').length;
      const skippedCount = questionTimesArray.filter(item => item.status === 'skipped').length;

      const ownerUid = window.__quizupCurrentAuthUser?.uid || getAnonymousId();
      const isAnonymousOwner = !window.__quizupCurrentAuthUser || window.__quizupCurrentAuthUser.isAnonymous !== false;
      const companyId = session.companyId;

      const result = {
        ownerUid,
        ownerType: isAnonymousOwner ? 'anonymous' : 'authenticated',
        sessionId,
        employee: session.sessionMode === 'open' ? (participantInfo || {}) : session.employee,
        answers,
        score: {
          correct,
          total: questions.length,
          percent: Math.round((correct / questions.length) * 100),
          timeouts: timeoutCount,
          skipped: skippedCount
        },
        timeTracking: {
          totalTime,
          averageTimePerQuestion,
          startTime: quizStartTime,
          endTime: Date.now(),
          questionTimes: questionTimesArray
        },
        location: userLocation || null,
        submittedAt: new Date().toISOString(),
      };

      const savedResult = await window.db.addResult(result, companyId);
      // Açık oturumlar aktif kalır, diğerleri tamamlandı olarak işaretlenir
      if (session.sessionMode !== 'open') {
        await window.db.updateSession(sessionId, { status: 'completed' });
      }

      // Save test ID to localStorage for anonymous users
      const anonId = getAnonymousId();
      const existingTests = JSON.parse(localStorage.getItem(`tests_${anonId}`) || '[]');
      if (!existingTests.includes(savedResult.id)) {
        existingTests.push(savedResult.id);
        localStorage.setItem(`tests_${anonId}`, JSON.stringify(existingTests));
      }

      toast('Quiz tamamlandı!', 'success');

      setTimeout(() => {
        window.location.hash = `#/result?sessionId=${sessionId}&resultId=${savedResult.id}`;
      }, 100);
    } catch(e) {
      window.devError('Submit error:', e);
      if (e?.message === 'Kullanıcı oturumu doğrulanamadı') {
        toast('Oturum doğrulanamadı. Lütfen sayfayı yenileyin.', 'error');
      } else {
        toast('Quiz gönderilirken hata oluştu', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;
  if (!session) return <Page title="Quiz"><div className="card p-6 text-red-600">Oturum bulunamadı.</div></Page>;
  if (questions.length === 0) return <Page title="Quiz"><div className="card p-6">Bu oturumda soru yok.</div></Page>;

  // Açık oturum: katılımcı bilgi formu
  if (session.sessionMode === 'open' && !participantInfo) {
    const handleParticipantSubmit = async () => {
      const errs = {};
      if (!participantForm.fullName.trim()) errs.fullName = 'Adınızı giriniz';
      if (!participantForm.store.trim()) errs.store = 'Mağaza giriniz';
      if (Object.keys(errs).length > 0) { setParticipantErrors(errs); return; }
      setJoiningLobby(true);
      try {
        await window.db.joinSessionLobby(sessionId, {
          fullName: participantForm.fullName.trim(),
          store: participantForm.store.trim(),
        });
        const info = { fullName: participantForm.fullName.trim(), store: participantForm.store.trim() };
        setParticipantInfo(info);
        // lobbyStartedAt'ı hemen çek
        const fresh = await window.db.getSessionById(sessionId);
        if (fresh?.lobbyStartedAt) setLobbyStartedAt(fresh.lobbyStartedAt);
      } catch (e) {
        toast('Lobiye katılırken hata oluştu', 'error');
      } finally {
        setJoiningLobby(false);
      }
    };
    return (
      <div className="quiz-fullscreen">
        <div className="quiz-content">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-dark-900 mb-6">Quize Başlamadan Önce</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-dark-700">Adınız Soyadınız *</label>
                <input
                  className={`field ${participantErrors.fullName ? 'error' : ''}`}
                  value={participantForm.fullName}
                  onChange={e => { setParticipantForm(f => ({ ...f, fullName: e.target.value })); setParticipantErrors(e2 => { const n = { ...e2 }; delete n.fullName; return n; }); }}
                  placeholder="Adınız Soyadınız"
                  autoFocus
                />
                {participantErrors.fullName && <div className="error-text">{participantErrors.fullName}</div>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-dark-700">Mağaza *</label>
                <input
                  className={`field ${participantErrors.store ? 'error' : ''}`}
                  value={participantForm.store}
                  onChange={e => { setParticipantForm(f => ({ ...f, store: e.target.value })); setParticipantErrors(e2 => { const n = { ...e2 }; delete n.store; return n; }); }}
                  placeholder="Mağaza adı"
                  onKeyDown={e => e.key === 'Enter' && handleParticipantSubmit()}
                />
                {participantErrors.store && <div className="error-text">{participantErrors.store}</div>}
              </div>
              <button className="btn btn-primary w-full mt-2" onClick={handleParticipantSubmit} disabled={joiningLobby}>
                {joiningLobby ? 'Katılınıyor...' : 'Hazır'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Açık oturum: lobi bekleme ekranı
  if (session.sessionMode === 'open' && participantInfo && !quizStarted) {
    return (
      <div className="quiz-fullscreen">
        <div className="quiz-content">
          <div className="max-w-md mx-auto text-center">

            {countdown !== null ? (
              <div className="lobby-countdown-big">{countdown}</div>
            ) : (
              <>
                <div className="lobby-timer-ring">
                  <span className="lobby-timer-value">{lobbyTimeLeft !== null ? lobbyTimeLeft : '—'}</span>
                </div>
                <p className="text-sm text-dark-500 mt-3">Quiz {lobbyTimeLeft !== null ? lobbyTimeLeft : '—'} saniye içinde başlıyor</p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const progress = ((idx + 1) / questions.length) * 100;
  const isTimedOut = timedOutQuestions[q.id];
  const isTotalTimer = session.timerMode === 'total' && sessionTimeLeft !== null;

  // Açık oturum + total timer: quiz başlayınca sayacı başlat
  if (session.sessionMode === 'open' && session.timerMode === 'total' && session.totalTimerSeconds && sessionTimeLeft === null && quizStarted) {
    setSessionTimeLeft(session.totalTimerSeconds);
  }

  return (
    <div className="quiz-fullscreen">
      {/* Quiz Top Bar */}
      <div className="quiz-topbar">
        {/* X butonu + sayaç */}
        <div className="quiz-topbar-left">
          <button
            className="quiz-topbar-quit"
            onClick={() => setShowAbandonModal(true)}
            title="Quizden Çık"
            aria-label="Quizden Çık"
          >
            <div className="quiz-topbar-quit-inner">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </button>
          <span className="quiz-topbar-counter" aria-label={`Soru ${idx + 1} / ${questions.length}`}>
            {idx + 1}/{questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="quiz-topbar-center">
          <div className="quiz-progress-track">
            <div className="quiz-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Timer */}
        <div className="quiz-topbar-timer">
          {isTotalTimer ? (
            <div className="quiz-total-timer">
              {Math.floor(sessionTimeLeft / 60)}:{String(sessionTimeLeft % 60).padStart(2, '0')}
            </div>
          ) : (
            q.hasTimer && q.timerSeconds && (
              <CircularTimer timeLeft={timeLeft} totalSeconds={timerTotal} isActive={timerActive} />
            )
          )}
        </div>
      </div>

      <div className="quiz-content">
        <div className="max-w-2xl mx-auto" ref={cardRef}>

          {/* Soru metni */}
          {q.questionImageUrl && (
            <div className="question-image-container mb-3">
              <img src={q.questionImageUrl} alt="Soru Görseli" />
            </div>
          )}
          <h2 className="text-lg sm:text-xl font-medium text-dark-900 leading-relaxed mb-4 px-1" dangerouslySetInnerHTML={{ __html: sanitizeHTML(q.questionText) }} />

          {/* Şıklar */}
          {q.type === 'mcq' ? (
            q.hasImageOptions && q.optionImageUrls && q.optionImageUrls.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {(q.options || []).map((o, i) => (
                  q.optionImageUrls[i] ? (
                    <div
                      key={i}
                      className={'image-option-card ' + (showAnswer ? (o === q.correctAnswer ? 'correct' : o === answers[q.id] ? 'wrong' : '') : (answers[q.id] === o ? 'selected' : '')) + (isTimedOut ? ' disabled' : '')}
                      onClick={() => !showAnswer && setAns(q.id, o)}
                    >
                      <img src={q.optionImageUrls[i]} alt={`Seçenek ${i + 1}`} />
                      <div className="text-center mt-2 text-sm font-medium text-dark-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHTML(o) }} />
                    </div>
                  ) : null
                ))}
              </div>
            ) : (
              <div className={'space-y-2' + ((isTimedOut || showAnswer) ? ' pointer-events-none' : '') + (isTimedOut ? ' opacity-60' : '')}>
                {(q.options || []).map((o, i) => (
                  <div
                    key={i}
                    className={'option-card ' + (showAnswer ? (o === q.correctAnswer ? 'correct' : o === answers[q.id] ? 'wrong' : '') : (answers[q.id] === o ? 'selected' : ''))}
                    onClick={() => setAns(q.id, o)}
                  >
                    <span className="text-[15px] font-normal text-dark-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHTML(o) }} />
                  </div>
                ))}
              </div>
            )
          ) : (
            <textarea
              className="field min-h-[200px]"
              placeholder="Cevabınızı buraya yazınız..."
              value={answers[q.id] || ''}
              onChange={e => setAns(q.id, e.target.value)}
              disabled={isTimedOut}
            ></textarea>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
            {/* Geri Butonu */}
            <button
              className="nav-pill nav-pill-prev relative"
              onClick={prev}
              disabled={idx === 0}
            >
              <div className="nav-pill-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </div>
              <span className="nav-pill-text">Geri</span>
              {idx > 0 && (
                <span className="absolute -top-1 -right-1 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                  <LockClosedIcon size={12} strokeWidth={2} className="text-gray-600" />
                </span>
              )}
            </button>

            {/* İleri/Bitir Butonu */}
            {idx < questions.length - 1 ? (
              <button className="nav-pill nav-pill-next" onClick={next}>
                <span className="nav-pill-text">İleri</span>
                <div className="nav-pill-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </button>
            ) : (
              <button
                className="nav-pill nav-pill-submit"
                onClick={() => submit()}
                disabled={submitting}
              >
                <span className="nav-pill-text">{submitting ? 'Kaydediliyor...' : 'Bitir'}</span>
                <div className="nav-pill-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </button>
            )}

          </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <>
            <div className="overlay open" onClick={() => setShowPasswordModal(false)}></div>
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 40,
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              maxWidth: '400px',
              width: '90%'
            }}>
              <h3 className="text-lg font-bold text-dark-900 mb-4 flex items-center gap-2">
                <LockClosedIcon size={20} strokeWidth={2} /> Uygulama PIN
              </h3>
              <p className="text-sm text-dark-600 mb-4">Önceki soruya dönmek için uygulama PIN'inizi girin.</p>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                className="field mb-2"
                placeholder="PIN"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                onKeyPress={e => e.key === 'Enter' && handlePinSubmit()}
                autoFocus
              />
              {pinError && (
                <div className="text-red-600 text-sm mb-3 flex items-center gap-1">
                  <XCircleIcon size={16} strokeWidth={2} /> {pinError}
                </div>
              )}
              <div className="flex gap-2">
                <button className="btn btn-ghost flex-1" onClick={() => {
                  setShowPasswordModal(false);
                  setPin('');
                  setPinError('');
                }}>
                  İptal
                </button>
                <button className="btn btn-primary flex-1" onClick={handlePinSubmit}>
                  Onayla
                </button>
              </div>
            </div>
          </>
        )}

        {showSkipConfirm && (
          <>
            <div className="overlay open" onClick={cancelSkip}></div>
            <div className="skip-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="skip-confirm-title">
              <div className="skip-confirm-icon" aria-hidden="true">⚠️</div>
              <div id="skip-confirm-title" className="skip-confirm-title">
                Soru Boş Bırakıldı Olarak İşaretlenecek. Emin Misiniz?
              </div>
              <div className="skip-confirm-actions">
                <button
                  type="button"
                  className="skip-confirm-button skip-confirm-cancel"
                  onClick={cancelSkip}
                  aria-label="İptal"
                  title="İptal"
                >
                  ✕
                </button>
                <button
                  type="button"
                  className="skip-confirm-button skip-confirm-approve"
                  onClick={confirmSkip}
                  aria-label="Onayla"
                  title="Onayla"
                >
                  ✓
                </button>
              </div>
            </div>
          </>
        )}
        </div> {/* max-w-2xl */}
      </div> {/* quiz-content */}

      {/* Abandon Quiz Modal */}
      {showAbandonModal && (
        <>
          <div className="overlay open" onClick={() => setShowAbandonModal(false)}></div>
          <div className="skip-confirm-modal">
            <div className="skip-confirm-icon">⚠️</div>
            <div className="skip-confirm-title">
              Quiz Terk Edildi Olarak İşaretlenecek.<br />Yanıtlarınız Boş Bırakılacaktır. Emin Misiniz?
            </div>
            <div className="skip-confirm-actions">
              <button
                className="skip-confirm-button skip-confirm-cancel"
                onClick={() => setShowAbandonModal(false)}
                title="İptal"
              >
                ✕
              </button>
              <button
                className="skip-confirm-button skip-confirm-approve"
                onClick={handleAbandonQuiz}
                disabled={submitting}
                title="Onayla ve Çık"
              >
                ✓
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

window.Quiz = Quiz;
