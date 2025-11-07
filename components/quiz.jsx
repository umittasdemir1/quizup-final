const { useState, useEffect, useRef, useCallback } = React;
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

const CircularTimer = ({ timeLeft, totalSeconds, isActive }) => {
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
};

const Quiz = ({ sessionId }) => {
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
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
  
  // 🔒 PIN Lock State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    const syncUser = () => {
      try {
        setCurrentUser(getCurrentUser());
      } catch (err) {
        console.warn('Quiz sayfasında kullanıcı bilgisi yenilenemedi:', err);
      }
    };

    window.addEventListener('user-info-updated', syncUser);
    window.addEventListener('fb-auth-state', syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('user-info-updated', syncUser);
      window.removeEventListener('fb-auth-state', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const refreshActiveUser = useCallback(async () => {
    try {
      await waitFirebase();
      const { auth, db, doc, getDoc } = window.firebase || {};
      const authUser = auth?.currentUser || window.__firebaseCurrentUser;

      if (!authUser?.uid || authUser.isAnonymous) {
        return;
      }

      const userSnapshot = await getDoc(doc(db, 'users', authUser.uid));
      if (!userSnapshot?.exists()) {
        return;
      }

      const userData = userSnapshot.data() || {};
      const normalizedPin = userData.applicationPin && /^\d{4}$/.test(userData.applicationPin)
        ? userData.applicationPin
        : '0000';

      const storedUser = (() => {
        try {
          return getCurrentUser() || {};
        } catch {
          return {};
        }
      })();

      const normalizedUser = {
        ...storedUser,
        uid: authUser.uid,
        email: storedUser.email || authUser.email || '',
        ...userData,
        company: userData.company || '',
        department: userData.department || '',
        position: userData.position || '',
        applicationPin: normalizedPin
      };

      try {
        localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
      } catch (storageErr) {
        console.warn('Quiz sayfasında kullanıcı bilgisi yerelde saklanamadı:', storageErr);
      }

      setCurrentUser(normalizedUser);
    } catch (err) {
      console.warn('Quiz sayfasında kullanıcı bilgisi güncellenemedi:', err);
    }
  }, []);

  const refreshSessionOwnerPin = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    try {
      await waitFirebase();
      const { db, doc, getDoc } = window.firebase || {};
      if (!db || !doc || !getDoc) {
        return;
      }

      const sessionSnapshot = await getDoc(doc(db, 'quizSessions', sessionId));
      if (!sessionSnapshot?.exists()) {
        return;
      }

      const sessionData = sessionSnapshot.data() || {};
      if (typeof sessionData.createdByApplicationPin === 'string' && /^\d{4}$/.test(sessionData.createdByApplicationPin)) {
        setSessionOwnerPin(sessionData.createdByApplicationPin);
      } else {
        setSessionOwnerPin(null);
      }
    } catch (err) {
      console.warn('Quiz oturum PIN bilgisi yenilenemedi:', err);
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
      await waitFirebase();
      try {
        const { db, doc, getDoc } = window.firebase;
        const s = await getDoc(doc(db, 'quizSessions', sessionId));
        if (!s.exists()) {
          setLoading(false);
          toast('Oturum bulunamadı', 'error');
          return;
        }
        const sd = { id: s.id, ...s.data() };
        setSession(sd);
        if (typeof sd.createdByApplicationPin === 'string' && /^\d{4}$/.test(sd.createdByApplicationPin)) {
          setSessionOwnerPin(sd.createdByApplicationPin);
        } else {
          setSessionOwnerPin(null);
        }
        const qs = await Promise.all((sd.questionIds || []).map(id => getDoc(doc(db, 'questions', id))));
        setQuestions(qs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() })));
        
        // ⏱️ Start quiz timer
        setQuizStartTime(Date.now());
        
        // 📍 Get location
        if (window.locationUtils) {
          window.locationUtils.getLocation().then(loc => {
            console.log('Location obtained:', loc);
            setUserLocation(loc);
          }).catch(err => {
            console.error('Location error:', err);
          });
        }
      } catch(e) {
        console.error('Quiz load error:', e);
        toast('Quiz yüklenirken hata oluştu', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const setAns = (qid, val) => setAnswers(a => ({ ...a, [qid]: val }));

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
            setTimeout(() => {
              // Check if answer was selected but not confirmed
              const currentAnswer = answers[questions[idx].id];
              if (currentAnswer != null && currentAnswer !== '') {
                toast('⏰ Süre doldu! Seçtiğiniz cevap kaydedilmedi', 'error');
              } else {
                toast('⏰ Süre doldu! Cevap verilmedi', 'error');
              }
            }, 200);
            
            // Record timeout (always mark as timeout regardless of selection)
            recordQuestionTime(questions[idx].id, 'timeout');
            
            // Clear the answer if it was selected but not confirmed
            setAnswers(prev => {
              const newAnswers = {...prev};
              delete newAnswers[questions[idx].id];
              return newAnswers;
            });
            
            // 🔀 AUTO NEXT OR SUBMIT
            setTimeout(() => {
              if (idx < questions.length - 1) {
                toast('➡️ Sonraki soruya geçiliyor...', 'warning');
                setIdx(i => i + 1);
              } else {
                // Son soruda süre bitti - otomatik test sonlandır
                toast('⏰ Test sonlandırıldı', 'error');
                setTimeout(() => {
                  submit(true, true); // skip confirmation, mark as timeout
                }, 1000);
              }
            }, 1500);
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
  const recordQuestionTime = (questionId, status = 'answered') => {
    if (questionStartTime) {
      const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
      setQuestionTimes(prev => ({
        ...prev,
        [questionId]: {
          timeSpent,
          status,
          timestamp: Date.now()
        }
      }));
    }
  };

  const next = () => {
    if (idx < questions.length - 1) {
      recordQuestionTime(questions[idx].id, answers[questions[idx].id] ? 'answered' : 'skipped');
      setTimerActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setIdx(i => i + 1);
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
      recordQuestionTime(questions[idx].id, answers[questions[idx].id] ? 'answered' : 'skipped');
      setTimerActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setIdx(i => i - 1);
      setShowPasswordModal(false);
      setPin('');
      setPinError('');
    }
  };
  
  const handlePinSubmit = () => {
    const fallbackPin = currentUser?.applicationPin && /^\d{4}$/.test(currentUser.applicationPin)
      ? currentUser.applicationPin
      : '0000';
    const expectedPin = sessionOwnerPin && /^\d{4}$/.test(sessionOwnerPin)
      ? sessionOwnerPin
      : fallbackPin;

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

  const submit = async (skipConfirm = false, isLastQuestionTimeout = false) => {
    if (!skipConfirm && !confirm('Quizi göndermek istediğinizden emin misiniz?')) return;

    // Determine last question status before recording
    const currentQuestionId = questions[idx].id;
    const lastQuestionAnswer = answers[currentQuestionId];
    const lastQuestionAnswered = lastQuestionAnswer != null && lastQuestionAnswer !== '';
    const lastQuestionStatus = isLastQuestionTimeout ? 'timeout' : (lastQuestionAnswered ? 'answered' : 'skipped');
    
    // Record time for last question
    recordQuestionTime(currentQuestionId, lastQuestionStatus);

    setSubmitting(true);
    try {
      await waitFirebase();
      const { db, collection, doc, addDoc, updateDoc, serverTimestamp, auth } = window.firebase;

      let correct = 0;
      questions.forEach(q => {
        if (q.type === 'mcq' && answers[q.id] === q.correctAnswer) correct++;
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
        
        return {
          questionId: q.id,
          questionText: q.questionText,
          category: q.category,
          timeSpent: questionTimes[q.id]?.timeSpent || 0,
          status: isLastQuestion ? lastQuestionStatus : (questionTimes[q.id]?.status || (hasAnswer ? 'answered' : 'skipped')),
          answered: questionAnswer || null,
          correct: q.type === 'mcq' ? questionAnswer === q.correctAnswer : null
        };
      });

      if (!window.__firebaseAuthReady) {
        try {
          await window.__firebaseAuthReadyPromise;
        } catch (err) {
          console.warn('Auth hazır beklenirken hata oluştu:', err);
        }
      }

      const ownerUid = auth?.currentUser?.uid || window.__firebaseCurrentUser?.uid || null;
      if (!ownerUid) {
        throw new Error('Kullanıcı oturumu doğrulanamadı');
      }
      const isAnonymousOwner = auth?.currentUser?.isAnonymous ?? window.__firebaseCurrentUser?.isAnonymous ?? false;
      const result = {
        ownerUid,
        ownerType: isAnonymousOwner ? 'anonymous' : 'authenticated',
        sessionId,
        employee: session.employee,
        answers,
        score: { 
          correct, 
          total: questions.length, 
          percent: Math.round((correct / questions.length) * 100) 
        },
        // ⏱️ Time tracking data
        timeTracking: {
          totalTime,
          averageTimePerQuestion,
          startTime: quizStartTime,
          endTime: Date.now(),
          questionTimes: questionTimesArray
        },
        // 📍 Location data
        location: userLocation || null,
        submittedAt: serverTimestamp()
      };

      const ref = await addDoc(collection(db, 'results'), result);
      await updateDoc(doc(db, 'quizSessions', sessionId), { status: 'completed' });

      // Save test ID to localStorage for anonymous users
      const anonId = getAnonymousId();
      const existingTests = JSON.parse(localStorage.getItem(`tests_${anonId}`) || '[]');
      if (!existingTests.includes(ref.id)) {
        existingTests.push(ref.id);
        localStorage.setItem(`tests_${anonId}`, JSON.stringify(existingTests));
      }

      toast('Quiz tamamlandı!', 'success');
      
      // Use setTimeout to ensure navigation happens after state updates
      setTimeout(() => {
        window.location.hash = `#/result?sessionId=${sessionId}&resultId=${ref.id}`;
      }, 100);
    } catch(e) {
      console.error('Submit error:', e);
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

  return (
    <Page title="Quiz" subtitle={(session.employee?.fullName || 'Personel') + ' • ' + (session.employee?.store || '')}>
      {q.hasTimer && q.timerSeconds && (
        <CircularTimer timeLeft={timeLeft} totalSeconds={timerTotal} isActive={timerActive} />
      )}
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-dark-700">Soru {idx + 1} / {questions.length}</span>
            <span className="text-dark-500">{Math.round(progress)}% Tamamlandı</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-300"
              style={{ width: progress + '%' }}
            ></div>
          </div>
        </div>

        <div className="card p-8 space-y-6" ref={cardRef}>
          <div>
            <div className="flex gap-2 mb-4">
              <span className="chip chip-blue">{typeLabel(q.type)}</span>
              <span className="chip chip-orange">{q.category}</span>
              {q.difficulty && <span className="chip bg-gray-200 text-gray-600">
                {q.difficulty === 'easy' ? 'Kolay' : q.difficulty === 'medium' ? 'Orta' : 'Zor'}
              </span>}
            </div>

            {q.questionImageUrl && (
              <div className="question-image-container mb-4">
                <img src={q.questionImageUrl} alt="Soru Görseli" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-dark-900 mb-6">{q.questionText}</h2>
          </div>

          {q.type === 'mcq' ? (
            q.hasImageOptions && q.optionImageUrls && q.optionImageUrls.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {(q.options || []).map((o, i) => (
                  q.optionImageUrls[i] ? (
                    <label 
                      key={i} 
                      className={'image-option-card ' + (answers[q.id] === o ? 'selected' : '')}
                    >
                      <input 
                        type="radio" 
                        name={'q-' + q.id} 
                        className="hidden" 
                        checked={answers[q.id] === o} 
                        onChange={() => setAns(q.id, o)}
                      />
                      <img src={q.optionImageUrls[i]} alt={`Seçenek ${i + 1}`} />
                      <div className="text-center mt-2 font-medium text-dark-900">{o}</div>
                    </label>
                  ) : null
                ))}
              </div>
            ) : (
              <div className="space-y-3">
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
                      />
                      <span className="font-medium text-dark-900 flex-1">{o}</span>
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
            ></textarea>
          )}

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-6">
            {/* Previous Button - Pill Shaped */}
            <button 
              className="nav-pill nav-pill-prev relative w-full sm:w-auto" 
              onClick={prev} 
              disabled={idx === 0}
            >
              <div className="nav-pill-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </div>
              <span className="nav-pill-text">ÖNCEKİ</span>
              {idx > 0 && (
                <span className="absolute -top-1 -right-1 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md">🔒</span>
              )}
            </button>

            {/* Progress Indicator - Pill Shaped */}
            <div className="nav-pill nav-pill-progress w-full sm:w-auto">
              <span className="nav-pill-text font-bold text-dark-700">
                {idx + 1}/{questions.length}
              </span>
            </div>

            {/* Next/Submit Button - Pill Shaped */}
            {idx < questions.length - 1 ? (
              <button className="nav-pill nav-pill-next w-full sm:w-auto" onClick={next}>
                <span className="nav-pill-text">SONRAKİ</span>
                <div className="nav-pill-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </button>
            ) : (
              <button 
                className="nav-pill nav-pill-submit w-full sm:w-auto" 
                onClick={submit}
                disabled={submitting}
              >
                <span className="nav-pill-text">{submitting ? 'GÖNDERİLİYOR...' : 'GÖNDER'}</span>
                <div className="nav-pill-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </button>
            )}
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
              <h3 className="text-lg font-bold text-dark-900 mb-4">🔒 Uygulama PIN</h3>
              <p className="text-sm text-dark-600 mb-4">Önceki soruya dönmek için uygulama PIN'inizi girin.</p>
              <input
                type="password"
                className="field mb-2"
                placeholder="PIN"
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handlePinSubmit()}
                autoFocus
              />
              {pinError && (
                <div className="text-red-600 text-sm mb-3">❌ {pinError}</div>
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
      </div>
    </Page>
  );
};

window.Quiz = Quiz;
