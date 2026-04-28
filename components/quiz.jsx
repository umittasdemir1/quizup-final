const { useState, useEffect, useRef, useCallback, memo } = React;
const { createPortal } = ReactDOM;

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

  const headerSlot = typeof document !== 'undefined'
    ? document.getElementById('header-timer-slot')
    : null;

  const timerNode = (
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

  if (headerSlot) {
    return createPortal(timerNode, headerSlot);
  }

  return (
    <div className="floating-timer" aria-live="polite">
      {timerNode}
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
      
      if (currentQ.hasTimer && currentQ.timerSeconds) {
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
          timeSpent: questionTimes[q.id]?.timeSpent || 0,
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
        employee: session.employee,
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
      await window.db.updateSession(sessionId, { status: 'completed' });

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

  if (loading) return <Page title="Quiz"><LoadingSpinner text="Quiz yükleniyor..." /></Page>;
  if (!session) return <Page title="Quiz"><div className="card p-6 text-red-600">Oturum bulunamadı.</div></Page>;
  if (questions.length === 0) return <Page title="Quiz"><div className="card p-6">Bu oturumda soru yok.</div></Page>;

  const q = questions[idx];
  const progress = ((idx + 1) / questions.length) * 100;
  const isTimedOut = timedOutQuestions[q.id];

  return (
    <Page
    >
      {q.hasTimer && q.timerSeconds && (
        <CircularTimer timeLeft={timeLeft} totalSeconds={timerTotal} isActive={timerActive} />
      )}
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
              style={{ width: progress + '%' }}
            ></div>
          </div>
        </div>

        <div className="card p-8 space-y-6" ref={cardRef}>
          <div>

            {q.questionImageUrl && (
              <div className="question-image-container mb-4">
                <img src={q.questionImageUrl} alt="Soru Görseli" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-dark-900 mb-6" dangerouslySetInnerHTML={{ __html: sanitizeHTML(q.questionText) }} />
          </div>

          {q.type === 'mcq' ? (
            q.hasImageOptions && q.optionImageUrls && q.optionImageUrls.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {(q.options || []).map((o, i) => (
                  q.optionImageUrls[i] ? (
                    <label
                      key={i}
                      className={'image-option-card ' + (answers[q.id] === o ? 'selected' : '') + (isTimedOut ? ' disabled' : '')}
                    >
                      <input
                        type="radio"
                        name={'q-' + q.id}
                        className="hidden"
                        checked={answers[q.id] === o}
                        onChange={() => setAns(q.id, o)}
                        disabled={isTimedOut}
                      />
                      <img src={q.optionImageUrls[i]} alt={`Seçenek ${i + 1}`} />
                      <div className="text-center mt-2 font-medium text-dark-900" dangerouslySetInnerHTML={{ __html: sanitizeHTML(o) }} />
                    </label>
                  ) : null
                ))}
              </div>
            ) : (
              <div className={'space-y-3' + (isTimedOut ? ' pointer-events-none opacity-60' : '')}>
                {(q.options || []).map((o, i) => (
                  <label
                    key={i}
                    className={'option-card ' + (answers[q.id] === o ? 'selected' : '')}
                    style={{ cursor: 'pointer', display: 'block' }}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={'q-' + q.id}
                        className="w-5 h-5 flex-shrink-0"
                        checked={answers[q.id] === o}
                        onChange={() => setAns(q.id, o)}
                        style={{ cursor: 'pointer' }}
                        disabled={isTimedOut}
                      />
                      <span className="font-medium text-dark-900 flex-1" dangerouslySetInnerHTML={{ __html: sanitizeHTML(o) }} />
                    </div>
                  </label>
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

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Previous Button */}
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
              <span className="nav-pill-text">Prev</span>
              {idx > 0 && (
                <span className="absolute -top-1 -right-1 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                  <LockClosedIcon size={12} strokeWidth={2} className="text-gray-600" />
                </span>
              )}
            </button>

            {/* Next/Submit Button */}
            {idx < questions.length - 1 ? (
              <button className="nav-pill nav-pill-next" onClick={next}>
                <span className="nav-pill-text">Next</span>
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
                <span className="nav-pill-text">{submitting ? 'Saving...' : 'Save'}</span>
                <div className="nav-pill-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </button>
            )}

            {/* Quit Button - sağda */}
            <button
              style={{ padding: '8px', borderRadius: '50%', background: '#fff1f0', border: '2px solid #fecaca', color: '#dc2626', transition: 'all 0.2s', cursor: 'pointer' }}
              onClick={() => setShowAbandonModal(true)}
              title="Quizden Çık"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
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
      </div>

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
    </Page>
  );
};

window.Quiz = Quiz;
