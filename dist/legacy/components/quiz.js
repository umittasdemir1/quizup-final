(() => {
  const { useState, useEffect, useRef, useCallback, memo } = React;
  const getAnonymousId = () => {
    let anonId = localStorage.getItem("anonUserId");
    if (!anonId) {
      anonId = "anon_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("anonUserId", anonId);
    }
    return anonId;
  };
  const CircularTimer = memo(({ timeLeft, totalSeconds, isActive }) => {
    if (!totalSeconds || totalSeconds <= 0) {
      return null;
    }
    const safeTime = Math.max(0, timeLeft != null ? timeLeft : totalSeconds);
    const progress = Math.max(0, Math.min(1, safeTime / totalSeconds));
    const strokeWidth = 4;
    const size = 40;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);
    let ringColor = "#3DA89C";
    if (progress <= 0.25) {
      ringColor = "#DC2626";
    } else if (progress <= 0.5) {
      ringColor = "#FF8C00";
    } else if (progress <= 0.75) {
      ringColor = "#FFD700";
    }
    const showEndingAnimation = safeTime <= 5 && isActive;
    return /* @__PURE__ */ React.createElement("div", { className: "circular-timer", role: "timer", "aria-label": `Kalan s\xFCre: ${safeTime} saniye` }, /* @__PURE__ */ React.createElement(
      "svg",
      {
        className: "circular-timer-ring",
        width: "100%",
        height: "100%",
        viewBox: `0 0 ${size} ${size}`
      },
      /* @__PURE__ */ React.createElement(
        "circle",
        {
          className: "circular-timer-ring-bg",
          strokeWidth,
          cx: size / 2,
          cy: size / 2,
          r: radius
        }
      ),
      /* @__PURE__ */ React.createElement(
        "circle",
        {
          className: "circular-timer-ring-progress",
          stroke: ringColor,
          strokeWidth,
          strokeDasharray: circumference,
          strokeDashoffset,
          cx: size / 2,
          cy: size / 2,
          r: radius,
          style: {
            filter: `drop-shadow(0 0 12px ${ringColor}40)`
          }
        }
      )
    ), /* @__PURE__ */ React.createElement("div", { className: `circular-timer-value ${showEndingAnimation ? "ending" : ""}` }, safeTime));
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
    const [participantInfo, setParticipantInfo] = useState(null);
    const [participantForm, setParticipantForm] = useState({ fullName: "", store: "" });
    const [participantErrors, setParticipantErrors] = useState({});
    const [joiningLobby, setJoiningLobby] = useState(false);
    const [lobbyParticipants, setLobbyParticipants] = useState([]);
    const [lobbyTimeLeft, setLobbyTimeLeft] = useState(null);
    const [lobbyStartedAt, setLobbyStartedAt] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [quizStarted, setQuizStarted] = useState(false);
    const lobbyIntervalRef = useRef(null);
    const countdownRef = useRef(null);
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
    const [quizStartTime, setQuizStartTime] = useState(null);
    const [questionStartTime, setQuestionStartTime] = useState(null);
    const [questionTimes, setQuestionTimes] = useState({});
    const [userLocation, setUserLocation] = useState(null);
    const [showAbandonModal, setShowAbandonModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [skipConfirmAction, setSkipConfirmAction] = useState(null);
    useEffect(() => {
      const syncUser = () => {
        try {
          setCurrentUser(getCurrentUser());
        } catch (err) {
          window.devWarn("Quiz sayfas\u0131nda kullan\u0131c\u0131 bilgisi yenilenemedi:", err);
        }
      };
      window.addEventListener("user-info-updated", syncUser);
      window.addEventListener("quizup-auth-state", syncUser);
      window.addEventListener("storage", syncUser);
      return () => {
        window.removeEventListener("user-info-updated", syncUser);
        window.removeEventListener("quizup-auth-state", syncUser);
        window.removeEventListener("storage", syncUser);
      };
    }, []);
    const refreshActiveUser = useCallback(async () => {
      try {
        const authUser = window.__quizupCurrentAuthUser;
        if (!(authUser == null ? void 0 : authUser.uid) || authUser.isAnonymous) return;
        const fresh = await window.loadCurrentSupabaseUser();
        if (!fresh) return;
        try {
          localStorage.setItem("currentUser", JSON.stringify(fresh));
        } catch (storageErr) {
          window.devWarn("Quiz sayfas\u0131nda kullan\u0131c\u0131 bilgisi yerelde saklanamad\u0131:", storageErr);
        }
        setCurrentUser(fresh);
      } catch (err) {
        window.devWarn("Quiz sayfas\u0131nda kullan\u0131c\u0131 bilgisi g\xFCncellenemedi:", err);
      }
    }, []);
    const refreshSessionOwnerPin = useCallback(async () => {
      if (!sessionId) return;
      try {
        const s = await window.db.getSessionById(sessionId);
        if (!s) return;
        if (typeof s.createdByApplicationPin === "string" && /^\d{4}$/.test(s.createdByApplicationPin)) {
          setSessionOwnerPin(s.createdByApplicationPin);
        } else {
          setSessionOwnerPin(null);
        }
      } catch (err) {
        window.devWarn("Quiz oturum PIN bilgisi yenilenemedi:", err);
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
            toast("Oturum bulunamad\u0131", "error");
            return;
          }
          setSession(sd);
          if (typeof sd.createdByApplicationPin === "string" && /^\d{4}$/.test(sd.createdByApplicationPin)) {
            setSessionOwnerPin(sd.createdByApplicationPin);
          } else {
            setSessionOwnerPin(null);
          }
          const qs = await window.db.getQuestionsByIds(sd.questionIds || []);
          setQuestions(qs.filter(Boolean));
          setQuizStartTime(Date.now());
          if (sd.timerMode === "total" && sd.totalTimerSeconds && sd.sessionMode !== "open") {
            setSessionTimeLeft(sd.totalTimerSeconds);
          }
          if (window.locationUtils) {
            window.locationUtils.getLocation().then((loc) => {
              window.devLog("Location obtained:", loc);
              setUserLocation(loc);
            }).catch((err) => {
              window.devError("Location error:", err);
            });
          }
        } catch (e) {
          window.devError("Quiz load error:", e);
          toast("Quiz y\xFCklenirken hata olu\u015Ftu", "error");
        } finally {
          setLoading(false);
        }
      })();
    }, [sessionId]);
    useEffect(() => {
      if (!lobbyStartedAt) return;
      const LOBBY_DURATION = 60;
      const tick = () => {
        const elapsed = Math.floor((Date.now() - new Date(lobbyStartedAt).getTime()) / 1e3);
        const left = Math.max(0, LOBBY_DURATION - elapsed);
        setLobbyTimeLeft(left);
        if (left <= 0) {
          clearInterval(lobbyIntervalRef.current);
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
          }, 1e3);
        }
      };
      tick();
      lobbyIntervalRef.current = setInterval(tick, 1e3);
      return () => {
        clearInterval(lobbyIntervalRef.current);
        clearInterval(countdownRef.current);
      };
    }, [lobbyStartedAt]);
    useEffect(() => {
      if (!participantInfo || !session || session.sessionMode !== "open") return;
      const unsubParticipants = window.db.onSessionParticipantsSnapshot(sessionId, (data) => {
        setLobbyParticipants(data);
      });
      let sessionPollTimer;
      const pollSession = async () => {
        try {
          const fresh = await window.db.getSessionById(sessionId);
          if ((fresh == null ? void 0 : fresh.lobbyStartedAt) && !lobbyStartedAt) {
            setLobbyStartedAt(fresh.lobbyStartedAt);
          }
        } catch (e) {
        }
        sessionPollTimer = setTimeout(pollSession, 2e3);
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
      setAnswers((a) => ({ ...a, [qid]: val }));
    };
    useEffect(() => {
      setTimedOutQuestions({});
    }, [sessionId]);
    useEffect(() => {
      setShowSkipConfirm(false);
      setShowAnswer(false);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    }, [idx]);
    useEffect(() => {
      window.scrollTo(0, 0);
      const mainElement = document.querySelector("main");
      if (mainElement) {
        mainElement.scrollTop = 0;
      }
    }, [idx]);
    useEffect(() => {
      if (questions.length > 0 && questions[idx]) {
        const currentQ = questions[idx];
        setQuestionStartTime(Date.now());
        if ((session == null ? void 0 : session.timerMode) !== "total" && currentQ.hasTimer && currentQ.timerSeconds) {
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
    useEffect(() => {
      if (timerActive && timeLeft !== null && timeLeft > 0) {
        timerRef.current = setInterval(() => {
          setTimeLeft((t) => {
            if (t <= 1) {
              setTimerActive(false);
              if (cardRef.current) {
                cardRef.current.classList.add("shake");
                setTimeout(() => {
                  cardRef.current.classList.add("red-flash");
                }, 100);
                setTimeout(() => {
                  cardRef.current.classList.remove("shake", "red-flash");
                }, 600);
              }
              const questionId = questions[idx].id;
              setTimedOutQuestions((prev2) => ({
                ...prev2,
                [questionId]: true
              }));
              recordQuestionTime(questionId, "timeout");
              setAnswers((prev2) => {
                const newAnswers = { ...prev2 };
                delete newAnswers[questionId];
                return newAnswers;
              });
              setTimeout(() => {
                if (idx < questions.length - 1) {
                  setIdx((i) => i + 1);
                } else {
                  setTimeout(() => {
                    submit(true, true);
                  }, 200);
                }
              }, 800);
              return 0;
            }
            return t - 1;
          });
        }, 1e3);
      }
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [timerActive, timeLeft, idx, questions.length, answers]);
    useEffect(() => {
      if (sessionTimeLeft === null || sessionTimeLeft <= 0) return;
      sessionTimerRef.current = setInterval(() => {
        setSessionTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(sessionTimerRef.current);
            setSessionTimerExpired(true);
            return 0;
          }
          return t - 1;
        });
      }, 1e3);
      return () => clearInterval(sessionTimerRef.current);
    }, [sessionTimeLeft !== null && sessionTimeLeft > 0 ? 1 : 0]);
    useEffect(() => {
      if (!sessionTimerExpired) return;
      setSessionTimerExpired(false);
      submit(true, true);
    }, [sessionTimerExpired]);
    const recordQuestionTime = (questionId, status = null) => {
      if (questionStartTime) {
        const timeSpent = Math.round((Date.now() - questionStartTime) / 1e3);
        const finalStatus = status || (timedOutQuestions[questionId] ? "timeout" : answers[questionId] ? "answered" : "skipped");
        setQuestionTimes((prev2) => ({
          ...prev2,
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
      const hasAnswer = answers[questionId] != null && answers[questionId] !== "";
      const status = statusOverride || (wasTimedOut ? "timeout" : hasAnswer ? "answered" : "skipped");
      recordQuestionTime(questionId, status);
      setTimerActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setIdx((i) => i + 1);
    };
    const next = () => {
      if (idx < questions.length - 1) {
        const questionId = questions[idx].id;
        const wasTimedOut = timedOutQuestions[questionId];
        const hasAnswer = answers[questionId] != null && answers[questionId] !== "";
        if (!wasTimedOut && !hasAnswer) {
          setSkipConfirmAction("next");
          setShowSkipConfirm(true);
          return;
        }
        if (questions[idx].type === "mcq" && hasAnswer && !showAnswer) {
          setShowAnswer(true);
          setTimerActive(false);
          if (timerRef.current) clearInterval(timerRef.current);
          if (answers[questionId] === questions[idx].correctAnswer) {
            revealTimerRef.current = setTimeout(() => {
              advanceToNextQuestion();
            }, 1e3);
          }
          return;
        }
        advanceToNextQuestion();
      }
    };
    const prev = () => {
      const hasAnsweredCurrent = answers[questions[idx].id] != null;
      if (hasAnsweredCurrent || idx > 0) {
        setShowPasswordModal(true);
        return;
      }
      goToPrevQuestion();
    };
    const goToPrevQuestion = () => {
      if (idx > 0) {
        const questionId = questions[idx].id;
        const wasTimedOut = timedOutQuestions[questionId];
        const hasAnswer = answers[questionId] != null && answers[questionId] !== "";
        const status = wasTimedOut ? "timeout" : hasAnswer ? "answered" : "skipped";
        recordQuestionTime(questionId, status);
        setTimerActive(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setIdx((i) => i - 1);
        setShowPasswordModal(false);
        setPin("");
        setPinError("");
      }
    };
    const handlePinSubmit = () => {
      const expectedPin = sessionOwnerPin && /^\d{4}$/.test(sessionOwnerPin) ? sessionOwnerPin : "";
      if (!expectedPin) {
        setPinError("Bu oturum i\xE7in uygulama PIN\u2019i tan\u0131ml\u0131 de\u011Fil.");
        setTimeout(() => setPinError(""), 2500);
        return;
      }
      if (!/^\d{4}$/.test(pin)) {
        setPinError("PIN 4 haneli olmal\u0131d\u0131r!");
        setTimeout(() => setPinError(""), 2e3);
        return;
      }
      if (pin === expectedPin) {
        goToPrevQuestion();
      } else {
        setPinError("Uygulama PIN'i hatal\u0131!");
        setTimeout(() => setPinError(""), 2e3);
      }
    };
    const handleAbandonQuiz = async () => {
      var _a, _b;
      setShowAbandonModal(false);
      setSubmitting(true);
      try {
        const ownerUid = ((_a = window.__quizupCurrentAuthUser) == null ? void 0 : _a.uid) || getAnonymousId();
        const companyId = session.companyId;
        const resultData = {
          ownerUid,
          ownerType: ((_b = window.__quizupCurrentAuthUser) == null ? void 0 : _b.isAnonymous) === false ? "authenticated" : "anonymous",
          sessionId,
          employee: session.employee || {},
          answers: answers || {},
          score: { correct: 0, total: questions.length, percent: 0, status: "abandoned" },
          timeTracking: {
            totalTime: quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1e3) : 0,
            questionTimes: []
          },
          location: userLocation || null,
          submittedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await window.db.addResult(resultData, companyId);
        await window.db.updateSession(sessionId, { status: "cancelled" });
        toast("Quiz terk edildi olarak kaydedildi", "warning");
        setTimeout(() => {
          location.hash = "#/";
        }, 1500);
      } catch (e) {
        window.devError("Abandon quiz error:", e);
        toast("Hata olu\u015Ftu", "error");
        setSubmitting(false);
      }
    };
    const confirmSkip = () => {
      const action = skipConfirmAction;
      setShowSkipConfirm(false);
      setSkipConfirmAction(null);
      if (action === "submit") {
        submit(true);
        return;
      }
      advanceToNextQuestion("skipped");
    };
    const cancelSkip = () => {
      setShowSkipConfirm(false);
      setSkipConfirmAction(null);
    };
    const submit = async (skipConfirm = false, isLastQuestionTimeout = false) => {
      var _a;
      const currentQuestionId = questions[idx].id;
      const lastQuestionAnswer = answers[currentQuestionId];
      const lastQuestionAnswered = lastQuestionAnswer != null && lastQuestionAnswer !== "";
      const lastQuestionTimedOut = isLastQuestionTimeout || timedOutQuestions[currentQuestionId];
      if (!skipConfirm && !lastQuestionTimedOut && !lastQuestionAnswered) {
        setSkipConfirmAction("submit");
        setShowSkipConfirm(true);
        return;
      }
      if (!skipConfirm && !confirm("Quizi g\xF6ndermek istedi\u011Finizden emin misiniz?")) return;
      const lastQuestionStatus = lastQuestionTimedOut ? "timeout" : lastQuestionAnswered ? "answered" : "skipped";
      const lastQuestionTimeSpent = questionStartTime ? Math.round((Date.now() - questionStartTime) / 1e3) : 0;
      recordQuestionTime(currentQuestionId, lastQuestionStatus);
      setSubmitting(true);
      try {
        let correct = 0;
        questions.forEach((q2) => {
          if (q2.type === "mcq" && !timedOutQuestions[q2.id] && answers[q2.id] === q2.correctAnswer) correct++;
        });
        const totalTime = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1e3) : 0;
        const averageTimePerQuestion = totalTime > 0 ? Math.round(totalTime / questions.length) : 0;
        const questionTimesArray = questions.map((q2) => {
          var _a2, _b;
          const isLastQuestion = q2.id === currentQuestionId;
          const questionAnswer = answers[q2.id];
          const hasAnswer = questionAnswer != null && questionAnswer !== "";
          const wasTimedOut = timedOutQuestions[q2.id];
          return {
            questionId: q2.id,
            questionText: q2.questionText,
            category: q2.category,
            timeSpent: isLastQuestion ? lastQuestionTimeSpent : ((_a2 = questionTimes[q2.id]) == null ? void 0 : _a2.timeSpent) || 0,
            status: wasTimedOut ? "timeout" : isLastQuestion ? lastQuestionStatus : ((_b = questionTimes[q2.id]) == null ? void 0 : _b.status) || (hasAnswer ? "answered" : "skipped"),
            answered: wasTimedOut ? null : questionAnswer || null,
            correct: q2.type === "mcq" ? !wasTimedOut && questionAnswer === q2.correctAnswer : null
          };
        });
        const timeoutCount = questionTimesArray.filter((item) => item.status === "timeout").length;
        const skippedCount = questionTimesArray.filter((item) => item.status === "skipped").length;
        const ownerUid = ((_a = window.__quizupCurrentAuthUser) == null ? void 0 : _a.uid) || getAnonymousId();
        const isAnonymousOwner = !window.__quizupCurrentAuthUser || window.__quizupCurrentAuthUser.isAnonymous !== false;
        const companyId = session.companyId;
        const result = {
          ownerUid,
          ownerType: isAnonymousOwner ? "anonymous" : "authenticated",
          sessionId,
          employee: session.sessionMode === "open" ? participantInfo || {} : session.employee,
          answers,
          score: {
            correct,
            total: questions.length,
            percent: Math.round(correct / questions.length * 100),
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
          submittedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        const savedResult = await window.db.addResult(result, companyId);
        if (session.sessionMode !== "open") {
          await window.db.updateSession(sessionId, { status: "completed" });
        }
        const anonId = getAnonymousId();
        const existingTests = JSON.parse(localStorage.getItem(`tests_${anonId}`) || "[]");
        if (!existingTests.includes(savedResult.id)) {
          existingTests.push(savedResult.id);
          localStorage.setItem(`tests_${anonId}`, JSON.stringify(existingTests));
        }
        toast("Quiz tamamland\u0131!", "success");
        setTimeout(() => {
          window.location.hash = `#/result?sessionId=${sessionId}&resultId=${savedResult.id}`;
        }, 100);
      } catch (e) {
        window.devError("Submit error:", e);
        if ((e == null ? void 0 : e.message) === "Kullan\u0131c\u0131 oturumu do\u011Frulanamad\u0131") {
          toast("Oturum do\u011Frulanamad\u0131. L\xFCtfen sayfay\u0131 yenileyin.", "error");
        } else {
          toast("Quiz g\xF6nderilirken hata olu\u015Ftu", "error");
        }
      } finally {
        setSubmitting(false);
      }
    };
    if (loading) return null;
    if (!session) return /* @__PURE__ */ React.createElement(Page, { title: "Quiz" }, /* @__PURE__ */ React.createElement("div", { className: "card p-6 text-red-600" }, "Oturum bulunamad\u0131."));
    if (questions.length === 0) return /* @__PURE__ */ React.createElement(Page, { title: "Quiz" }, /* @__PURE__ */ React.createElement("div", { className: "card p-6" }, "Bu oturumda soru yok."));
    if (session.sessionMode === "open" && !participantInfo) {
      const handleParticipantSubmit = async () => {
        const errs = {};
        if (!participantForm.fullName.trim()) errs.fullName = "Ad\u0131n\u0131z\u0131 giriniz";
        if (!participantForm.store.trim()) errs.store = "Ma\u011Faza giriniz";
        if (Object.keys(errs).length > 0) {
          setParticipantErrors(errs);
          return;
        }
        setJoiningLobby(true);
        try {
          await window.db.joinSessionLobby(sessionId, {
            fullName: participantForm.fullName.trim(),
            store: participantForm.store.trim()
          });
          const info = { fullName: participantForm.fullName.trim(), store: participantForm.store.trim() };
          setParticipantInfo(info);
          const fresh = await window.db.getSessionById(sessionId);
          if (fresh == null ? void 0 : fresh.lobbyStartedAt) setLobbyStartedAt(fresh.lobbyStartedAt);
        } catch (e) {
          toast("Lobiye kat\u0131l\u0131rken hata olu\u015Ftu", "error");
        } finally {
          setJoiningLobby(false);
        }
      };
      return /* @__PURE__ */ React.createElement("div", { className: "quiz-fullscreen" }, /* @__PURE__ */ React.createElement("div", { className: "quiz-content" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-md mx-auto" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-semibold text-dark-900 mb-6" }, "Quize Ba\u015Flamadan \xD6nce"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-1 text-dark-700" }, "Ad\u0131n\u0131z Soyad\u0131n\u0131z *"), /* @__PURE__ */ React.createElement(
        "input",
        {
          className: `field ${participantErrors.fullName ? "error" : ""}`,
          value: participantForm.fullName,
          onChange: (e) => {
            setParticipantForm((f) => ({ ...f, fullName: e.target.value }));
            setParticipantErrors((e2) => {
              const n = { ...e2 };
              delete n.fullName;
              return n;
            });
          },
          placeholder: "Ad\u0131n\u0131z Soyad\u0131n\u0131z",
          autoFocus: true
        }
      ), participantErrors.fullName && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, participantErrors.fullName)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold mb-1 text-dark-700" }, "Ma\u011Faza *"), /* @__PURE__ */ React.createElement(
        "input",
        {
          className: `field ${participantErrors.store ? "error" : ""}`,
          value: participantForm.store,
          onChange: (e) => {
            setParticipantForm((f) => ({ ...f, store: e.target.value }));
            setParticipantErrors((e2) => {
              const n = { ...e2 };
              delete n.store;
              return n;
            });
          },
          placeholder: "Ma\u011Faza ad\u0131",
          onKeyDown: (e) => e.key === "Enter" && handleParticipantSubmit()
        }
      ), participantErrors.store && /* @__PURE__ */ React.createElement("div", { className: "error-text" }, participantErrors.store)), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary w-full mt-2", onClick: handleParticipantSubmit, disabled: joiningLobby }, joiningLobby ? "Kat\u0131l\u0131n\u0131yor..." : "Haz\u0131r")))));
    }
    if (session.sessionMode === "open" && participantInfo && !quizStarted) {
      return /* @__PURE__ */ React.createElement("div", { className: "quiz-fullscreen" }, /* @__PURE__ */ React.createElement("div", { className: "quiz-content" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-md mx-auto text-center" }, countdown !== null ? /* @__PURE__ */ React.createElement("div", { className: "lobby-countdown-big" }, countdown) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "lobby-timer-ring" }, /* @__PURE__ */ React.createElement("span", { className: "lobby-timer-value" }, lobbyTimeLeft !== null ? lobbyTimeLeft : "\u2014")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-500 mt-3" }, "Quiz ", lobbyTimeLeft !== null ? lobbyTimeLeft : "\u2014", " saniye i\xE7inde ba\u015Fl\u0131yor")))));
    }
    const q = questions[idx];
    const progress = (idx + 1) / questions.length * 100;
    const isTimedOut = timedOutQuestions[q.id];
    const isTotalTimer = session.timerMode === "total" && sessionTimeLeft !== null;
    if (session.sessionMode === "open" && session.timerMode === "total" && session.totalTimerSeconds && sessionTimeLeft === null && quizStarted) {
      setSessionTimeLeft(session.totalTimerSeconds);
    }
    return /* @__PURE__ */ React.createElement("div", { className: "quiz-fullscreen" }, /* @__PURE__ */ React.createElement("div", { className: "quiz-topbar" }, /* @__PURE__ */ React.createElement("div", { className: "quiz-topbar-left" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "quiz-topbar-quit",
        onClick: () => setShowAbandonModal(true),
        title: "Quizden \xC7\u0131k",
        "aria-label": "Quizden \xC7\u0131k"
      },
      /* @__PURE__ */ React.createElement("div", { className: "quiz-topbar-quit-inner" }, /* @__PURE__ */ React.createElement("svg", { width: "26", height: "26", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), /* @__PURE__ */ React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })))
    ), /* @__PURE__ */ React.createElement("span", { className: "quiz-topbar-counter", "aria-label": `Soru ${idx + 1} / ${questions.length}` }, idx + 1, "/", questions.length)), /* @__PURE__ */ React.createElement("div", { className: "quiz-topbar-center" }, /* @__PURE__ */ React.createElement("div", { className: "quiz-progress-track" }, /* @__PURE__ */ React.createElement("div", { className: "quiz-progress-fill", style: { width: `${progress}%` } }))), /* @__PURE__ */ React.createElement("div", { className: "quiz-topbar-timer" }, isTotalTimer ? /* @__PURE__ */ React.createElement("div", { className: "quiz-total-timer" }, Math.floor(sessionTimeLeft / 60), ":", String(sessionTimeLeft % 60).padStart(2, "0")) : q.hasTimer && q.timerSeconds && /* @__PURE__ */ React.createElement(CircularTimer, { timeLeft, totalSeconds: timerTotal, isActive: timerActive }))), /* @__PURE__ */ React.createElement("div", { className: "quiz-content" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-2xl mx-auto", ref: cardRef }, q.questionImageUrl && /* @__PURE__ */ React.createElement("div", { className: "question-image-container mb-3" }, /* @__PURE__ */ React.createElement("img", { src: q.questionImageUrl, alt: "Soru G\xF6rseli" })), /* @__PURE__ */ React.createElement("h2", { className: "text-lg sm:text-xl font-medium text-dark-900 leading-relaxed mb-4 px-1", dangerouslySetInnerHTML: { __html: sanitizeHTML(q.questionText) } }), q.type === "mcq" ? q.hasImageOptions && q.optionImageUrls && q.optionImageUrls.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, (q.options || []).map((o, i) => q.optionImageUrls[i] ? /* @__PURE__ */ React.createElement(
      "div",
      {
        key: i,
        className: "image-option-card " + (showAnswer ? o === q.correctAnswer ? "correct" : o === answers[q.id] ? "wrong" : "" : answers[q.id] === o ? "selected" : "") + (isTimedOut ? " disabled" : ""),
        onClick: () => !showAnswer && setAns(q.id, o)
      },
      /* @__PURE__ */ React.createElement("img", { src: q.optionImageUrls[i], alt: `Se\xE7enek ${i + 1}` }),
      /* @__PURE__ */ React.createElement("div", { className: "text-center mt-2 text-sm font-medium text-dark-900 leading-relaxed", dangerouslySetInnerHTML: { __html: sanitizeHTML(o) } })
    ) : null)) : /* @__PURE__ */ React.createElement("div", { className: "space-y-2" + (isTimedOut || showAnswer ? " pointer-events-none" : "") + (isTimedOut ? " opacity-60" : "") }, (q.options || []).map((o, i) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: i,
        className: "option-card " + (showAnswer ? o === q.correctAnswer ? "correct" : o === answers[q.id] ? "wrong" : "" : answers[q.id] === o ? "selected" : ""),
        onClick: () => setAns(q.id, o)
      },
      /* @__PURE__ */ React.createElement("span", { className: "text-[15px] font-normal text-dark-900 leading-relaxed", dangerouslySetInnerHTML: { __html: sanitizeHTML(o) } })
    ))) : /* @__PURE__ */ React.createElement(
      "textarea",
      {
        className: "field min-h-[200px]",
        placeholder: "Cevab\u0131n\u0131z\u0131 buraya yaz\u0131n\u0131z...",
        value: answers[q.id] || "",
        onChange: (e) => setAns(q.id, e.target.value),
        disabled: isTimedOut
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "20px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "nav-pill nav-pill-prev relative",
        onClick: prev,
        disabled: idx === 0
      },
      /* @__PURE__ */ React.createElement("div", { className: "nav-pill-icon" }, /* @__PURE__ */ React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("polyline", { points: "15 18 9 12 15 6" }))),
      /* @__PURE__ */ React.createElement("span", { className: "nav-pill-text" }, "Geri"),
      idx > 0 && /* @__PURE__ */ React.createElement("span", { className: "absolute -top-1 -right-1 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-md" }, /* @__PURE__ */ React.createElement(LockClosedIcon, { size: 12, strokeWidth: 2, className: "text-gray-600" }))
    ), idx < questions.length - 1 ? /* @__PURE__ */ React.createElement("button", { className: "nav-pill nav-pill-next", onClick: next }, /* @__PURE__ */ React.createElement("span", { className: "nav-pill-text" }, "\u0130leri"), /* @__PURE__ */ React.createElement("div", { className: "nav-pill-icon" }, /* @__PURE__ */ React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("polyline", { points: "9 18 15 12 9 6" })))) : /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "nav-pill nav-pill-submit",
        onClick: () => submit(),
        disabled: submitting
      },
      /* @__PURE__ */ React.createElement("span", { className: "nav-pill-text" }, submitting ? "Kaydediliyor..." : "Bitir"),
      /* @__PURE__ */ React.createElement("div", { className: "nav-pill-icon" }, /* @__PURE__ */ React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("polyline", { points: "20 6 9 17 4 12" })))
    )), showPasswordModal && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "overlay open", onClick: () => setShowPasswordModal(false) }), /* @__PURE__ */ React.createElement("div", { style: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 40,
      background: "white",
      borderRadius: "16px",
      padding: "24px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      maxWidth: "400px",
      width: "90%"
    } }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-dark-900 mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(LockClosedIcon, { size: 20, strokeWidth: 2 }), " Uygulama PIN"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dark-600 mb-4" }, "\xD6nceki soruya d\xF6nmek i\xE7in uygulama PIN'inizi girin."), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        inputMode: "numeric",
        pattern: "[0-9]*",
        className: "field mb-2",
        placeholder: "PIN",
        value: pin,
        onChange: (e) => setPin(e.target.value.replace(/\D/g, "")),
        onKeyPress: (e) => e.key === "Enter" && handlePinSubmit(),
        autoFocus: true
      }
    ), pinError && /* @__PURE__ */ React.createElement("div", { className: "text-red-600 text-sm mb-3 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(XCircleIcon, { size: 16, strokeWidth: 2 }), " ", pinError), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-ghost flex-1", onClick: () => {
      setShowPasswordModal(false);
      setPin("");
      setPinError("");
    } }, "\u0130ptal"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary flex-1", onClick: handlePinSubmit }, "Onayla")))), showSkipConfirm && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "overlay open", onClick: cancelSkip }), /* @__PURE__ */ React.createElement("div", { className: "skip-confirm-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "skip-confirm-title" }, /* @__PURE__ */ React.createElement("div", { className: "skip-confirm-icon", "aria-hidden": "true" }, "\u26A0\uFE0F"), /* @__PURE__ */ React.createElement("div", { id: "skip-confirm-title", className: "skip-confirm-title" }, "Soru Bo\u015F B\u0131rak\u0131ld\u0131 Olarak \u0130\u015Faretlenecek. Emin Misiniz?"), /* @__PURE__ */ React.createElement("div", { className: "skip-confirm-actions" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "skip-confirm-button skip-confirm-cancel",
        onClick: cancelSkip,
        "aria-label": "\u0130ptal",
        title: "\u0130ptal"
      },
      "\u2715"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "skip-confirm-button skip-confirm-approve",
        onClick: confirmSkip,
        "aria-label": "Onayla",
        title: "Onayla"
      },
      "\u2713"
    ))))), " "), " ", showAbandonModal && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "overlay open", onClick: () => setShowAbandonModal(false) }), /* @__PURE__ */ React.createElement("div", { className: "skip-confirm-modal" }, /* @__PURE__ */ React.createElement("div", { className: "skip-confirm-icon" }, "\u26A0\uFE0F"), /* @__PURE__ */ React.createElement("div", { className: "skip-confirm-title" }, "Quiz Terk Edildi Olarak \u0130\u015Faretlenecek.", /* @__PURE__ */ React.createElement("br", null), "Yan\u0131tlar\u0131n\u0131z Bo\u015F B\u0131rak\u0131lacakt\u0131r. Emin Misiniz?"), /* @__PURE__ */ React.createElement("div", { className: "skip-confirm-actions" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "skip-confirm-button skip-confirm-cancel",
        onClick: () => setShowAbandonModal(false),
        title: "\u0130ptal"
      },
      "\u2715"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "skip-confirm-button skip-confirm-approve",
        onClick: handleAbandonQuiz,
        disabled: submitting,
        title: "Onayla ve \xC7\u0131k"
      },
      "\u2713"
    )))));
  };
  window.Quiz = Quiz;
})();
