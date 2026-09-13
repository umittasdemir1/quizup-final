import React, { useEffect, useRef } from 'react';

// Presentation only: the moderator, shared timer and scoring remain in LiveQuiz.
export default function DuelQuizScreen({ state, remaining, locked, busy, error, onAnswer, onLeave }) {
  const contentRef = useRef(null);
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [state.questionIndex]);
  const q = state.question;
  const revealed = state.phase === 'reveal';
  const CircularTimer = window.CircularTimer;
  const selectionClass = value => revealed
    ? value === q.correctAnswer ? 'correct' : state.answer === value ? 'wrong' : ''
    : state.answer === value ? 'selected' : '';
  const choices = [{ value: 'Doğru', label: 'Doğru' }, { value: 'Yanlış', label: 'Yanlış' }];

  return <div className="quiz-fullscreen duel-quiz-screen">
    <div className="quiz-topbar">
      <div className="quiz-topbar-row quiz-topbar-row-top">
        <button className="quiz-topbar-quit" onClick={onLeave} title="Düellodan Çık" aria-label="Düellodan Çık"><div className="quiz-topbar-quit-inner"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg></div></button>
        <div className="quiz-topbar-xp" aria-label={`Toplam ${state.liveXp || 0} XP`} title="Kazanılan XP"><img className="quiz-topbar-xp-icon" src="/assets/xp-icon.png" alt="" aria-hidden="true" />{(state.liveXp || 0).toLocaleString('tr-TR')}</div>
        <div className="quiz-topbar-timer">{CircularTimer && <CircularTimer timeLeft={remaining} totalSeconds={revealed ? 3 : 60} isActive={remaining > 0} />}</div>
      </div>
      <div className="quiz-topbar-row quiz-topbar-row-bottom"><span className="quiz-topbar-counter" aria-label={`Soru ${state.questionIndex + 1} / ${state.total}`}>{state.questionIndex + 1}/{state.total}</span><div className="quiz-topbar-center"><div className="quiz-progress-track" role="progressbar" aria-label="Düello ilerlemesi" aria-valuemin={0} aria-valuemax={state.total} aria-valuenow={state.questionIndex + 1}><div className="quiz-progress-fill" style={{ width: `${(state.questionIndex + 1) / state.total * 100}%` }} /></div></div></div>
    </div>
    <div className="quiz-content" ref={contentRef}><div className="max-w-2xl mx-auto">
      {error && <div className="live-error" role="alert">{error}</div>}
      {q.image && <div className="question-image-container mb-3"><img src={q.image} alt="Soru Görseli" /></div>}
      <h2 className="duel-question-text text-lg sm:text-xl font-medium text-dark-900 leading-relaxed px-1">{q.text}</h2>
      <div className="duel-answer-buttons" role="group" aria-label="Cevabınızı seçin">
        {choices.map(choice => <button key={choice.value} type="button" className={`duel-answer-button ${choice.value === 'Doğru' ? 'true' : 'false'} ${selectionClass(choice.value)}`} disabled={locked} aria-pressed={state.answer === choice.value} aria-label={choice.label} title={choice.label} onClick={() => onAnswer(choice.value)}>{choice.value === 'Doğru' ? <svg className="duel-symbol-circle" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="34" /></svg> : <svg className="duel-symbol-cross" viewBox="0 0 100 100" aria-hidden="true"><path d="m24 24 52 52M76 24 24 76" /></svg>}</button>)}
      </div>
      <div className="mt-12 text-center text-sm text-dark-600 tabular-nums" role="status" aria-label={`${state.answeredCount} cevaplayan, ${state.participantCount} toplam katılımcı`}>{state.answeredCount} | {state.participantCount}</div>
    </div></div>
  </div>;
}
