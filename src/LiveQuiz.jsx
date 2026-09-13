import React, { useCallback, useEffect, useRef, useState } from 'react';
import db from './db.js';
import AnswerFeedbackSheet from './AnswerFeedbackSheet.jsx';
import OpenQuizScreen from './OpenQuizScreen.jsx';
import { clockAnchor, secondsRemaining } from './liveClock.js';
import './liveQuiz.css';

function getOwnerId() {
  let id = localStorage.getItem('anonUserId');
  if (!id) { id = `anon_${crypto.randomUUID()}`; localStorage.setItem('anonUserId', id); }
  return id;
}

export default function LiveQuiz({ sessionId, moderatorView = false }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: '', store: '' });
  const [draft, setDraft] = useState('');
  const [remaining, setRemaining] = useState(null);
  const [connected, setConnected] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [dismissedFeedback, setDismissedFeedback] = useState(null);
  const [token, setToken] = useState(null);
  const anchor = useRef(null);
  const stateRef = useRef(null);
  const generation = useRef(0);
  const sequence = useRef(0);
  const applied = useRef(0);
  const actionLock = useRef(false);
  const lastSuccess = useRef(0);

  useEffect(() => {
    if (moderatorView) return;
    try {
      const key = `quizup:live:${sessionId}`;
      let value = localStorage.getItem(key);
      if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
      setToken(value);
    } catch { setError('Katılımı korumak için tarayıcınızda site depolamasına izin verin.'); }
  }, [sessionId, moderatorView]);

  const request = useCallback(async (action = 'state', payload = {}) => {
    const order = ++sequence.current;
    const currentGeneration = generation.current;
    const sent = performance.now();
    const next = await db.liveQuiz(sessionId, action, token, payload);
    if (generation.current !== currentGeneration || order < applied.current) return next;
    applied.current = order;
    anchor.current = clockAnchor(next.serverNow, sent, performance.now());
    lastSuccess.current = performance.now();
    if (!stateRef.current) setError('');
    if (stateRef.current?.questionIndex !== next.questionIndex) setDraft('');
    stateRef.current = next;
    setState(next);
    setRemaining(secondsRemaining(next.deadline, anchor.current));
    setConnected(true);
    return next;
  }, [sessionId, token]);

  useEffect(() => {
    let stopped = false;
    let timer;
    let polling = false;
    const poll = async () => {
      if (stopped || polling || actionLock.current) return;
      clearTimeout(timer);
      polling = true;
      try { await request(); }
      catch (e) {
        if (!stopped) { setConnected(false); if (!stateRef.current) setError(e.message || 'Oturuma bağlanılamadı.'); }
      } finally {
        polling = false;
        if (!stopped) timer = setTimeout(poll, document.hidden ? 3000 : 1000);
      }
    };
    const resume = () => {
      if (!document.hidden) { setConnected(false); poll(); }
    };
    poll();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', poll);
    const ticker = setInterval(() => {
      setRemaining(secondsRemaining(stateRef.current?.deadline, anchor.current));
      if (performance.now() - lastSuccess.current > 5000) setConnected(false);
      // Restart polling when a mutation occupied the previous scheduled tick.
      if (!polling && !actionLock.current && performance.now() - lastSuccess.current > 2000) poll();
    }, 200);
    return () => {
      stopped = true;
      generation.current += 1;
      clearTimeout(timer);
      clearInterval(ticker);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', poll);
    };
  }, [request]);

  const act = async (action, payload = {}) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await request(action, payload);
      if (action === 'answer' && !next.answer) setError('Soru kapandı; cevabınız kaydedilmedi.');
      if (action === 'leave') setShowLeave(false);
    } catch (e) { setError(e.message || 'İşlem tamamlanamadı. Tekrar deneyin.'); }
    finally { actionLock.current = false; setBusy(false); }
  };

  const openResult = () => {
    try {
      const key = `tests_${getOwnerId()}`;
      const ids = JSON.parse(localStorage.getItem(key) || '[]');
      if (!ids.includes(state.resultId)) localStorage.setItem(key, JSON.stringify([...ids, state.resultId]));
    } catch { /* The result link remains available. */ }
    window.location.hash = `#/result?sessionId=${sessionId}&resultId=${state.resultId}`;
  };

  const Page = window.Page;
  const duel = state?.mode === 'duel';
  const moderator = moderatorView && state?.moderator;
  const q = state?.question;
  const revealed = state?.phase === 'reveal';
  const locked = busy || !connected || state?.phase !== 'question' || Boolean(state?.answer) || remaining === 0;
  const feedbackKey = `${sessionId}:${state?.questionIndex}`;
  const showFeedback = duel && !moderatorView && state?.active && Boolean(state?.answer)
    && ['question', 'reveal'].includes(state?.phase) && state?.answerFeedback?.text
    && dismissedFeedback !== feedbackKey && !showLeave;
  const players = state?.participants || [];
  const nextQuestion = () => act('next', { phase: state.phase, questionIndex: state.questionIndex });
  const participantCards = players.filter(p => p.active).map((p, i) => <div className="live-player" key={p.id}><span className="live-avatar">{i + 1}</span><strong>{p.fullName}</strong><small>{state.phase === 'lobby' ? p.store : p.answered ? '✓ Cevapladı' : 'Bekleniyor'}</small></div>);

  const leaveDialog = showLeave && <div className="live-modal-backdrop"><div className="card live-card" role="dialog" aria-modal="true" aria-labelledby="leave-title"><h2 id="leave-title">Yarışmadan ayrılsın mı?</h2><p>Bu oturuma tekrar katılamazsınız. Verdiğiniz cevaplar korunur.</p><div className="live-actions"><button autoFocus className="btn btn-secondary" onClick={() => setShowLeave(false)} disabled={busy}>Devam et</button><button className="btn btn-danger" onClick={() => act('leave')} disabled={busy}>Oturumdan ayrıl</button></div></div></div>;
  if (state?.mode === 'open' && !moderatorView && state.active && q && ['question', 'reveal'].includes(state.phase)) {
    return <>
      <OpenQuizScreen state={state} remaining={remaining} locked={locked} busy={busy} error={error} draft={draft} onDraftChange={setDraft} onLeave={() => setShowLeave(true)} onAnswer={answer => act('answer', { questionIndex: state.questionIndex, answer })} />
      {leaveDialog}
    </>;
  }

  return <Page title={duel ? '1’e 1 Düello' : 'Açık Oturum'} subtitle={moderatorView ? 'Moderatör paneli' : 'Birlikte yarış, bilgini göster'}>
    <div className="live-shell">
      {error && <div className="live-error" role="alert">{error}</div>}
      {!state ? <div className="card p-6" role="status">Sunucuya bağlanılıyor…</div>
        : moderatorView && !moderator ? <div className="card p-6">Bu oturumu yönetmek için yetkili hesabınızla giriş yapın. <a className="btn btn-primary" href="#/login">Giriş yap</a></div>
        : <>
          <div className="live-toolbar">
            <span className={`live-connection ${connected ? '' : 'offline'}`} role="status">{connected ? '● Canlı bağlantı' : '○ Bağlantı yenileniyor…'}</span>
            <span className="chip chip-blue">{state.participantCount}{duel ? ' / 2' : ''} katılımcı</span>
            {state.playerId && state.active && state.phase !== 'finished' && !moderator && <button className="btn btn-ghost" onClick={() => setShowLeave(true)}>Ayrıl</button>}
          </div>
          {!moderator && !state.playerId ? <div className="card live-card">
            <div className="live-emblem" aria-hidden="true">{duel ? '1 : 1' : '◎'}</div>
            <h2>{state.phase === 'lobby' ? 'Yarışmaya katıl' : 'Katılım kapandı'}</h2>
            <p>{state.phase === 'lobby' ? (duel ? 'İki yarışmacı, aynı sorular. Soruları moderatör açar.' : 'Her soru için 60 saniye. Herkes cevapladığında sonuç hemen görünür.') : 'Bu sınav başladı veya tamamlandı. Katıldığınız tarayıcıdan devam edebilirsiniz.'}</p>
            {state.phase === 'lobby' && <form onSubmit={e => { e.preventDefault(); act('join', { ...form, ownerUid: getOwnerId() }); }} className="live-form">
              <label>Ad soyad<input autoComplete="name" className="field" required minLength={2} maxLength={100} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label>
              <label>Mağaza<input className="field" required maxLength={100} value={form.store} onChange={e => setForm({ ...form, store: e.target.value })} /></label>
              <button className="btn btn-primary" disabled={busy || !token || !connected || (duel && state.participantCount >= 2)}>{busy ? 'Katılınıyor…' : duel && state.participantCount >= 2 ? 'İki koltuk da dolu' : 'Lobiye katıl'}</button>
            </form>}
          </div>
            : !moderator && !state.active && state.phase !== 'finished' ? <div className="card live-card"><h2>Oturumdan ayrıldınız</h2><p>Diğer katılımcılar sınava devam ediyor.</p><a className="btn btn-primary" href="#/">Ana sayfa</a></div>
            : state.phase === 'lobby' ? <div className="card live-card">
              <div className="live-emblem" aria-hidden="true">{duel ? '1 : 1' : '◎'}</div>
              <h2>{duel ? 'Düello lobisi' : 'Herkes hazırlanıyor'}</h2>
              <p>{duel ? 'İki katılımcı hazır olduğunda moderatör ilk soruyu açacak.' : remaining === null ? 'İlk katılımcı geldiğinde lobi süresi başlayacak.' : 'Lobi kapanınca herkes aynı soruyla başlayacak.'}</p>
              {!duel && remaining !== null && <div className="live-countdown">{remaining <= 3 ? remaining : remaining - 3}<small>{remaining <= 3 ? 'Başlıyor' : 'saniye sonra başlıyor'}</small></div>}
              <div className={duel ? 'live-seats' : 'live-players'}>{participantCards}{duel && Array.from({ length: Math.max(0, 2 - state.participantCount) }, (_, i) => <div className="live-player empty" key={`empty${i}`}>Rakip bekleniyor…</div>)}</div>
              {moderator && duel && <button className="btn btn-primary" disabled={busy || !connected || state.participantCount !== 2} onClick={nextQuestion}>İlk soruyu sor</button>}
            </div>
            : state.phase === 'finished' ? <div className="card live-card">
              <div className="live-emblem" aria-hidden="true">🏆</div><h2>Yarışma tamamlandı!</h2>
              {duel && (() => { const ranked = [...players].sort((a, b) => (b.score?.xp || 0) - (a.score?.xp || 0)); return <p>{ranked.length === 2 && ranked[0].score?.xp === ranked[1].score?.xp ? 'Berabere! İkinize de tebrikler.' : `${ranked[0]?.fullName || ''} birinci oldu!`}</p>; })()}
              <ol className="live-ranking">{[...players].sort((a, b) => (b.score?.xp || 0) - (a.score?.xp || 0)).map(p => <li key={p.id}><strong>{p.fullName}</strong><span>{p.score?.correct || 0} / {state.total} doğru · {p.score?.xp || 0} XP</span></li>)}</ol>
              {state.resultId && <button className="btn btn-primary" onClick={openResult}>Sonucum ve PDF raporu</button>}
            </div>
            : q && <div className="card live-card live-question" key={state.questionIndex}>
              <div className="live-question-top"><span>Soru {state.questionIndex + 1} / {state.total}</span><span className={`live-timer ${remaining <= 10 && !revealed ? 'urgent' : ''}`} aria-label={`Kalan süre ${remaining ?? 0} saniye`}>{revealed ? 'Sonuç' : `${remaining ?? '—'} sn`}</span></div>
              <div className="live-progress" role="progressbar" aria-label="Soru süresi" aria-valuemin={0} aria-valuemax={60} aria-valuenow={revealed ? 0 : remaining || 0}><div style={{ width: `${revealed ? 0 : (remaining || 0) / 60 * 100}%` }} /></div>
              <h2>{q.text}</h2>
              {q.image && <img className="live-question-image" src={q.image} alt="Soru görseli" />}
              {q.type === 'mcq' ? <div className="space-y-2 mt-6">
                {(q.options || []).map((option, i) => <button key={i} className={`option-card w-full text-left ${!revealed && state.answer === option ? 'selected' : ''} ${revealed && option === q.correctAnswer ? 'correct' : ''} ${revealed && state.answer === option && option !== q.correctAnswer ? 'wrong' : ''}`} disabled={locked || moderator} aria-pressed={state.answer === option} onClick={() => act('answer', { questionIndex: state.questionIndex, answer: option })}>
                  <span className="text-[15px] font-normal leading-relaxed">{option}</span>
                  {q.optionImages?.[i] && <img className="max-h-48 mx-auto object-contain" src={q.optionImages[i]} alt={`${String.fromCharCode(65 + i)} şıkkı görseli`} />}
                  {revealed && option === q.correctAnswer && <small className="block mt-2">✓ Doğru cevap</small>}
                  {revealed && state.answer === option && option !== q.correctAnswer && <small className="block mt-2">✕ Yanlış cevap</small>}
                </button>)}
              </div> : <form className="live-form" onSubmit={e => { e.preventDefault(); act('answer', { questionIndex: state.questionIndex, answer: draft }); }}><label>Cevabınız<textarea className="field" maxLength={4000} required disabled={locked || moderator} value={state.answer || draft} onChange={e => setDraft(e.target.value)} /></label>{!moderator && <button className="btn btn-primary" disabled={locked || !draft.trim()}>Cevabı gönder</button>}</form>}
              <div className="live-feedback" role="status">{revealed ? q.type !== 'mcq' ? 'Cevaplar toplandı. Açık uçlu yanıtları moderatör değerlendirebilir.' : moderator ? 'Soru kapandı. Doğru cevap yukarıda.' : state.answer ? state.answer === q.correctAnswer ? '✓ Doğru cevap, tebrikler!' : '✕ Bu kez olmadı. Doğru cevap yukarıda.' : 'Süre doldu. Bu soruya cevap vermediniz.' : state.answer ? 'Cevabınız kaydedildi. Diğer katılımcılar bekleniyor…' : 'Seçiminiz gönderildiğinde değiştirilemez.'}</div>
              <p className="live-answer-count">{state.answeredCount} / {state.participantCount} kişi cevapladı</p>
              {moderator && <div className="live-players">{participantCards}</div>}
              {revealed && (duel ? moderator ? <button className="btn btn-primary" disabled={busy || !connected} onClick={nextQuestion}>{state.questionIndex + 1 === state.total ? 'Düelloyu bitir' : 'Sonraki soruyu sor'}</button> : <p>Moderatörün devam etmesi bekleniyor…</p> : <p>{remaining > 0 ? `${remaining} saniye sonra ${state.questionIndex + 1 === state.total ? 'sonuçlar' : 'sonraki soru'}…` : 'Oturum güncelleniyor…'}</p>)}
            </div>}
        </>}
      {showFeedback && <AnswerFeedbackSheet key={feedbackKey} feedback={state.answerFeedback} onClose={() => setDismissedFeedback(feedbackKey)} />}
      {leaveDialog}
    </div>
  </Page>;
}
