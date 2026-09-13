import React, { useEffect, useRef } from 'react';

// Presentation only: timing, answers and question transitions stay in LiveQuiz.
export default function OpenQuizScreen({ state, remaining, locked, connected, busy, error, draft, onDraftChange, onAnswer, onLeave }) {
  const contentRef = useRef(null);
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [state.questionIndex]);
  const q = state.question;
  const revealed = state.phase === 'reveal';
  const CircularTimer = window.CircularTimer;
  const imageOptions = q.optionImages?.some(Boolean);
  const textProps = value => window.sanitizeHTML
    ? { dangerouslySetInnerHTML: { __html: window.sanitizeHTML(value) } }
    : { children: value };
  const optionState = option => revealed
    ? option === q.correctAnswer ? 'correct' : state.answer === option ? 'wrong' : ''
    : state.answer === option ? 'selected' : '';
  const feedback = revealed
    ? q.type !== 'mcq' ? 'Cevaplar toplandı. Açık uçlu yanıtları moderatör değerlendirebilir.'
      : !state.answer ? 'Süre doldu. Bu soruya cevap vermediniz.'
        : state.answer === q.correctAnswer ? '✓ Doğru cevap, tebrikler!' : '✕ Bu kez olmadı. Doğru cevap yukarıda.'
    : state.answer ? 'Cevabınız kaydedildi. Diğer katılımcılar bekleniyor…' : 'Seçiminiz gönderildiğinde değiştirilemez.';

  return <div className="quiz-fullscreen open-quiz-screen">
    <div className="quiz-topbar">
      <div className="quiz-topbar-row quiz-topbar-row-top">
        <button className="quiz-topbar-quit" onClick={onLeave} title="Quizden Çık" aria-label="Quizden Çık">
          <div className="quiz-topbar-quit-inner"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg></div>
        </button>
        <div className="quiz-topbar-xp" aria-label={`${state.participantCount} katılımcı`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3" /></svg>
          {state.participantCount} katılımcı
        </div>
        <div className="quiz-topbar-timer">
          {revealed ? <span className="text-sm text-dark-600">Sonuç</span> : CircularTimer && <CircularTimer timeLeft={remaining} totalSeconds={60} isActive={remaining > 0} />}
        </div>
      </div>
      <div className="quiz-topbar-row quiz-topbar-row-bottom">
        <span className="quiz-topbar-counter" aria-label={`Soru ${state.questionIndex + 1} / ${state.total}`}>{state.questionIndex + 1}/{state.total}</span>
        <div className="quiz-topbar-center"><div className="quiz-progress-track" role="progressbar" aria-label="Sınav ilerlemesi" aria-valuemin={0} aria-valuemax={state.total} aria-valuenow={state.questionIndex + 1}><div className="quiz-progress-fill" style={{ width: `${(state.questionIndex + 1) / state.total * 100}%` }} /></div></div>
      </div>
    </div>
    <div className="quiz-content" ref={contentRef}>
      <div className="max-w-2xl mx-auto">
        {error && <div className="live-error" role="alert">{error}</div>}
        {q.image && <div className="question-image-container mb-3"><img src={q.image} alt="Soru Görseli" /></div>}
        <h2 className="text-lg sm:text-xl font-medium text-dark-900 leading-relaxed mb-4 px-1" {...textProps(q.text)} />
        {q.type === 'mcq' ? <div className={imageOptions ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
          {(q.options || []).map((option, i) => <button key={i} type="button" className={`${imageOptions ? 'image-option-card' : 'option-card'} w-full text-left ${optionState(option)}`} disabled={locked} aria-pressed={state.answer === option} onClick={() => onAnswer(option)}>
            {imageOptions && q.optionImages[i] && <img src={q.optionImages[i]} alt={`Seçenek ${i + 1}`} />}
            <span className={imageOptions ? 'block text-center mt-2 text-sm font-medium text-dark-900 leading-relaxed' : 'text-[15px] font-normal text-dark-900 leading-relaxed'} {...textProps(option)} />
            {revealed && option === q.correctAnswer && <small className="block mt-2">✓ Doğru cevap</small>}
            {revealed && state.answer === option && option !== q.correctAnswer && <small className="block mt-2">✕ Yanlış cevap</small>}
          </button>)}
        </div> : <form onSubmit={event => { event.preventDefault(); onAnswer(draft); }}>
          <textarea className="field min-h-[200px]" aria-label="Cevabınız" placeholder="Cevabınızı buraya yazınız..." maxLength={4000} required disabled={locked} value={state.answer || draft} onChange={event => onDraftChange(event.target.value)} />
          <div className="flex justify-center mt-5"><button className="nav-pill nav-pill-submit" disabled={locked || !draft.trim()}><span className="nav-pill-text">{busy ? 'Kaydediliyor…' : 'Cevabı gönder'}</span><span className="nav-pill-icon" aria-hidden="true">✓</span></button></div>
        </form>}
        <div className="mt-5 text-center text-sm text-dark-600" role="status">
          <p className="font-medium">{feedback}</p>
          <p className="mt-2">{state.answeredCount} / {state.participantCount} kişi cevapladı</p>
          {revealed && <p className="mt-2">{remaining > 0 ? `${remaining} saniye sonra ${state.questionIndex + 1 === state.total ? 'sonuçlar' : 'sonraki soru'}…` : 'Oturum güncelleniyor…'}</p>}
          <p className={`live-connection mt-3 ${connected ? '' : 'offline'}`}>{connected ? '● Canlı bağlantı' : '○ Bağlantı yenileniyor…'}</p>
        </div>
      </div>
    </div>
  </div>;
}
