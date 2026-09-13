import React, { useEffect, useState } from 'react';
import db from './db.js';
import LiveQuiz from './LiveQuiz.jsx';

export default function QuizRouter({ sessionId, moderator = false }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    db.getSessionById(sessionId).then(value => {
      if (!active) return;
      if (!value) setError('Oturum bulunamadı.');
      else setSession(value);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [sessionId]);
  if (error) return <div className="card p-6" role="alert">{error}</div>;
  if (!session) return <div className="card p-6">Oturum yükleniyor…</div>;
  if (['open', 'duel'].includes(session.sessionMode)) return <LiveQuiz sessionId={sessionId} moderatorView={moderator} />;
  const Quiz = window.Quiz;
  return <Quiz sessionId={sessionId} />;
}
