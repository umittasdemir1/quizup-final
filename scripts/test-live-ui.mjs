// Component interactions in a DOM environment. Server behavior is tested separately
// by test-live-quizzes.sql and test-live-api.mjs; this test checks the actual UI.
// Install jsdom outside the app: npm install --prefix /tmp/quizup-dom-test jsdom@26
import assert from 'node:assert/strict';
import { build, transform } from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { JSDOM } = await import(process.env.JSDOM_MODULE || '/tmp/quizup-dom-test/node_modules/jsdom/lib/api.js');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://quizup.test/', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.navigator = dom.window.navigator;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import('react');
const { act } = React;
globalThis.React = React;
new Function((await transform(await readFile('components/quiz.jsx', 'utf8'), { loader: 'jsx', format: 'iife' })).code)();
const { createRoot } = await import('react-dom/client');
window.Page = ({ children, title }) => React.createElement('section', null, React.createElement('h1', null, title), children);

const calls = [];
let state = {
  mode: 'duel', phase: 'lobby', total: 1, questionIndex: 0, deadline: null,
  moderator: false, playerId: null, active: null, participants: [], participantCount: 0,
  answeredCount: 0, answer: null, question: null,
};
const question = { id: 'q1', text: 'Türkiye’nin başkenti hangisidir?', type: 'mcq', options: ['Ankara', 'İstanbul', 'İzmir', 'Bursa'] };
const duelQuestion = { id: 'duel-q1', text: 'Luca modelinin fiyatı 4.400 TL’dir.', type: 'mcq', options: ['Doğru', 'Yanlış'] };
const players = [{ id: 'p1', fullName: 'Test Bir', store: 'Test', active: true }, { id: 'p2', fullName: 'Test İki', store: 'Test', active: true }];
globalThis.__liveTestDb = { liveQuiz: async (sid, action, token, payload) => {
  calls.push({ sid, action, token, payload });
  if (action === 'join') state = { ...state, playerId: 'p1', active: true, participantCount: 2, participants: players };
  if (action === 'answer') state = { ...state, answer: payload.answer, answeredCount: 1, answerFeedback: { text: 'Luca modelinin doğru fiyatı 4.400 TL’dir.', isCorrect: payload.answer === 'Doğru' } };
  if (action === 'leave') state = { ...state, active: false };
  if (action === 'next') state = state.phase === 'lobby'
    ? { ...state, phase: 'question', question: state.mode === 'duel' ? duelQuestion : question, deadline: new Date(Date.now() + 60000).toISOString() }
    : { ...state, phase: 'finished', question: null, participants: players.map(p => ({ ...p, score: { xp: 100, correct: 1 } })) };
  return { ...state, serverNow: new Date().toISOString() };
} };
const out = 'node_modules/.cache/quizup-live-ui-test.mjs';
await mkdir('node_modules/.cache', { recursive: true });
await build({ entryPoints: ['src/LiveQuiz.jsx'], outfile: out, bundle: true, platform: 'node', format: 'esm', external: ['react'], loader: { '.css': 'empty' }, plugins: [{ name: 'mock-db', setup(b) {
  b.onResolve({ filter: /^\.\/db\.js$/ }, () => ({ path: 'db', namespace: 'mock' }));
  b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export default globalThis.__liveTestDb;', loader: 'js' }));
} }] });
const { default: LiveQuiz } = await import(pathToFileURL(`${process.cwd()}/${out}`));
let root;
const mount = async moderatorView => {
  root = createRoot(document.getElementById('root'));
  await act(async () => { root.render(React.createElement(LiveQuiz, { sessionId: 'test-session', moderatorView })); });
};
const sync = () => act(async () => { window.dispatchEvent(new window.Event('online')); });
const click = el => act(async () => { assert.ok(el, 'Button exists'); el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
const setInput = async (el, value) => act(async () => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
});

try {
  await mount(false);
  assert.match(document.body.textContent, /Yarışmaya katıl/);
  const inputs = document.querySelectorAll('.live-form input');
  await setInput(inputs[0], 'Test Bir'); await setInput(inputs[1], 'Test');
  await act(async () => { document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); });
  assert.equal(calls.find(c => c.action === 'join').payload.fullName, 'Test Bir');
  assert.match(document.body.textContent, /Düello lobisi/);
  assert.equal(document.querySelectorAll('.live-player').length, 2);
  state = { ...state, phase: 'question', question: duelQuestion, deadline: new Date(Date.now() + 60000).toISOString() };
  await sync();
  assert.ok(document.querySelector('.duel-quiz-screen.quiz-fullscreen'), 'Duel uses the individual fullscreen layout');
  assert.equal(document.querySelectorAll('.duel-answer-button').length, 2);
  assert.ok(document.querySelector('.duel-answer-button.true .duel-symbol-circle circle'));
  assert.ok(document.querySelector('.duel-answer-button.false .duel-symbol-cross path'));
  assert.equal(document.querySelector('.duel-answer-button.true').getAttribute('aria-label'), 'Doğru');
  assert.ok(document.querySelector('.quiz-topbar .circular-timer'));
  await click(document.querySelector('.duel-answer-button.false'));
  assert.equal(calls.find(c => c.action === 'answer').payload.questionIndex, 0);
  assert.equal(document.querySelector('.duel-answer-button.false').getAttribute('aria-pressed'), 'true');
  assert.ok([...document.querySelectorAll('.duel-answer-button')].every(button => button.disabled));
  assert.equal(document.querySelector('dialog.live-answer-sheet').open, true);
  assert.match(document.querySelector('.live-sheet-status').textContent, /Yanlış cevap/);
  assert.match(document.querySelector('.live-sheet-explanation').textContent, /4.400 TL/);
  await click([...document.querySelectorAll('button')].find(b => b.textContent === 'Anladım'));
  await sync();
  assert.equal(document.querySelector('.live-answer-sheet'), null, 'Polling cannot reopen dismissed explanation');
  state = { ...state, questionIndex: 1, answer: null, answerFeedback: null };
  await sync();
  assert.equal(document.querySelector('.live-answer-sheet'), null, 'No explanation before answering');
  await click(document.querySelector('.duel-answer-button.true'));
  assert.match(document.querySelector('.live-sheet-status').textContent, /Doğru cevap!/);
  state = { ...state, questionIndex: 2, answer: null, answerFeedback: null };
  await sync();
  assert.equal(document.querySelector('.live-answer-sheet'), null, 'Moderator advancing dismisses the old explanation');
  state = { ...state, questionIndex: 0, answer: 'Yanlış', answerFeedback: null };

  state = { ...state, phase: 'reveal', question: { ...duelQuestion, correctAnswer: 'Doğru' } };
  await sync();
  assert.ok(document.querySelector('.duel-answer-button.correct'));
  assert.ok(document.querySelector('.duel-answer-button.wrong'));
  assert.doesNotMatch(document.body.textContent, /Moderatörün devam etmesi bekleniyor|Doğru cevap|Yanlış cevap/);
  await click(document.querySelector('.quiz-topbar-quit'));
  assert.ok(document.querySelector('[role="dialog"]'));
  await click([...document.querySelectorAll('button')].find(b => b.textContent === 'Oturumdan ayrıl'));
  assert.match(document.body.textContent, /Oturumdan ayrıldınız/);
  await act(async () => root.unmount());
  state = { ...state, phase: 'lobby', active: null, playerId: null, answer: null, moderator: true, question: null, participantCount: 2 };
  await mount(true);
  assert.equal(document.querySelector('form'), null);
  await click([...document.querySelectorAll('button')].find(b => b.textContent === 'İlk soruyu sor'));
  assert.ok(calls.some(c => c.action === 'next' && c.payload.phase === 'lobby'));
  assert.ok([...document.querySelectorAll('.option-card')].every(b => b.disabled));
  state = { ...state, phase: 'reveal', question: { ...duelQuestion, correctAnswer: 'Doğru' } };
  await sync();
  await click([...document.querySelectorAll('button')].find(b => b.textContent === 'Düelloyu bitir'));
  assert.match(document.body.textContent, /Yarışma tamamlandı/);
  assert.match(document.body.textContent, /Berabere/);
  assert.equal(document.querySelectorAll('.live-ranking li').length, 2);
  await act(async () => root.unmount());
  state = { mode: 'open', phase: 'question', total: 2, questionIndex: 0,
    deadline: new Date(Date.now() + 60000).toISOString(), moderator: false,
    playerId: 'p1', active: true, participants: players, participantCount: 2,
    answeredCount: 0, answer: null, question, answerFeedback: null };
  await mount(false);
  assert.ok(document.querySelector('.quiz-fullscreen .quiz-content .max-w-2xl'));
  assert.equal(document.querySelector('.live-question'), null, 'Open exam uses individual layout');
  assert.ok(document.querySelector('.quiz-topbar .circular-timer'));
  assert.equal(document.querySelector('.circular-timer-value').textContent.trim(), '60');
  assert.equal(document.querySelector('.quiz-topbar-counter').textContent, '1/2');
  assert.equal(document.querySelector('.quiz-progress-fill').style.width, '50%');
  const openCalls = calls.length;
  await click(document.querySelector('.option-card:nth-child(2)'));
  assert.equal(document.querySelector('.option-card:nth-child(2)').getAttribute('aria-pressed'), 'true');
  assert.ok([...document.querySelectorAll('.option-card')].every(b => b.disabled));
  assert.equal(document.querySelector('.live-answer-sheet'), null, 'Duel explanation stays out of open mode');
  state = { ...state, phase: 'reveal', answeredCount: 2, question: { ...question, correctAnswer: 'Ankara' } };
  await sync();
  assert.ok(document.querySelector('.option-card.correct'));
  assert.ok(document.querySelector('.option-card.wrong'));
  assert.doesNotMatch(document.body.textContent, /Seçiminiz gönderildiğinde|kişi cevapladı|Canlı bağlantı|Doğru cevap|Yanlış cevap|sonraki soru/);
  assert.match(document.querySelector('.quiz-content [role="status"]').textContent, /2 \| 2/);
  state = { ...state, liveXp: 180 };
  await sync();
  assert.equal(document.querySelector('.quiz-topbar-xp').textContent.trim(), '180');
  assert.ok(document.querySelector('.quiz-topbar-xp-icon'));
  await sync();
  assert.equal(document.querySelector('.quiz-topbar-xp').textContent.trim(), '180', 'Polling does not add XP twice');
  const content = document.querySelector('.quiz-content');
  content.scrollTop = 300;
  state = { ...state, phase: 'question', questionIndex: 1, answer: null, answeredCount: 0,
    answerFeedback: null, question: { ...question, optionImages: ['/a.png', '/b.png', '', ''] } };
  await sync();
  assert.equal(content.scrollTop, 0, 'Only question transition resets inner scroll');
  assert.equal(document.querySelector('.quiz-topbar-counter').textContent, '2/2');
  assert.equal(document.querySelectorAll('.image-option-card').length, 4, 'Image layout preserves every shared option');
  state = { ...state, question: { id: 'text', type: 'open', text: 'Yanıtınızı açıklayın.' } };
  await sync();
  assert.ok(document.querySelector('textarea.field.min-h-\\[200px\\]'));
  assert.ok(document.querySelector('.nav-pill-submit'));
  assert.ok(calls.slice(openCalls).every(c => ['state', 'answer'].includes(c.action)), 'UI never advances the shared question');
  await click(document.querySelector('.quiz-topbar-quit'));
  assert.ok(document.querySelector('[role="dialog"]'));
  await click([...document.querySelectorAll('button')].find(b => b.textContent === 'Devam et'));
  assert.ok(document.querySelector('.quiz-fullscreen'));
  console.log('PASS: open exam uses individual fullscreen/header/timer/progress/text and image options; immutable answers, shared reveal, server-driven transitions, open text and quit confirmation');
  console.log('PASS: participant form, full-screen true/false duel buttons, immutable answer, right/wrong feedback, quit confirmation, moderator start/finish, final ranking');
} finally { if (root) await act(async () => root.unmount()); dom.window.close(); }
