import React, { useEffect, useRef } from 'react';

export default function AnswerFeedbackSheet({ feedback, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  const correct = feedback.isCorrect;
  return <dialog ref={dialogRef} className="live-answer-sheet" aria-labelledby="answer-sheet-title" aria-describedby="answer-sheet-text" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="live-sheet-handle" aria-hidden="true" />
    <div className="live-sheet-heading">
      <span className={`live-sheet-status ${correct === false ? 'incorrect' : ''}`}>
        <span aria-hidden="true">{correct === false ? '✕' : '✓'}</span>
        {correct === true ? 'Doğru cevap!' : correct === false ? 'Yanlış cevap' : 'Cevabın kaydedildi'}
      </span>
      <button type="button" className="live-sheet-close" aria-label="Doğru yanıt panelini kapat" onClick={onClose}>✕</button>
    </div>
    <h2 id="answer-sheet-title">Doğru yanıt</h2>
    <p id="answer-sheet-text" className="live-sheet-explanation">{feedback.text}</p>
    <button type="button" className="btn btn-primary w-full" onClick={onClose}>Anladım</button>
  </dialog>;
}
