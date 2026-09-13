// Component interactions in a DOM environment. Server behavior is tested separately
// by test-live-quizzes.sql and test-live-api.mjs; this test checks the actual UI.
// Install jsdom outside the app: npm install --prefix /tmp/quizup-dom-test jsdom@26
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
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
const { createRoot } = await import('react-dom/client');
window.Page = ({ children, title }) => React.createElement('section', null, React.createElement('h1', null, title), children);

const calls = [];
let state = {
  mode: 'duel', phase: 'lobby', total: 1, questionIndex: 0, deadline: null,
  moderator: false, playerId: null, active: null, participants: [], participantCount: 0,
  answeredCount: 0, answer: null, question: null,
};
const question = { id: 'q1', text: 'Türkiye’nin başkenti hangisidir?', type: 'mcq', options: ['Ankara', 'İstanbul', 'İzmir', 'Bursa'] };
const players = [{ id: 'p1', fullName: 'Test Bir', store: 'Test', active: true }, { id: 'p2', fullName: 'Test İki', store: 'Test', active: true }];
globalThis.__liveTestDb = { liveQuiz: async (sid, action, token, payload) => {
  calls.push({ sid, action, token, payload });
  if (action === 'join') state = { ...state, playerId: 'p1', active: true, participantCount: 2, participants: players };
  if (action === 'answer') state = { ...state, answer: payload.answer, answeredCount: 1, answerFeedback: { text: 'Türkiye’nin başkenti Ankara’dır.', isCorrect: payload.answer === 'Ankara' } };
  if (action === 'leave') state = { ...state, active: false };
  if (action === 'next') state = state.phase === 'lobby'
    ? { ...state, phase: 'question', question, deadline: new Date(Date.now() + 60000).toISOString() }
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
  state = { ...state, phase: 'question', question, deadline: new Date(Date.now() + 60000).toISOString() };
  await sync();
  assert.equal(document.querySelectorAll('.option-card').length, 4);
  assert.match(document.querySelector('.live-timer').textContent, /60 sn/);
  await click(document.querySelector('.option-card:nth-child(2)'));
  assert.equal(calls.find(c => c.action === 'answer').payload.questionIndex, 0);
  assert.equal(document.querySelector('.option-card:nth-child(2)').getAttribute('aria-pressed'), 'true');
  assert.equal(document.querySelector('.option-card:first-child').disabled, true);
  assert.match(document.body.textContent, /Cevabınız kaydedildi/);
  assert.equal(document.querySelector('dialog.live-answer-sheet').open, true);
  assert.match(document.querySelector('.live-sheet-status').textContent, /Yanlış cevap/);
  assert.match(document.querySelector('.live-sheet-explanation').textContent, /Ankara/);
  await click([...document.querySelectorAll('button')].find(b => b.textContent === 'Anladım'));
  await sync();
  assert.equal(document.querySelector('.live-answer-sheet'), null, 'Polling cannot reopen dismissed explanation');
  state = { ...state, questionIndex: 1, answer: null, answerFeedback: null };
  await sync();
  assert.equal(document.querySelector('.live-answer-sheet'), null, 'No explanation before answering');
  await click(document.querySelector('.option-card:first-child'));
  assert.match(document.querySelector('.live-sheet-status').textContent, /Doğru cevap!/);
  state = { ...state, questionIndex: 2, answer: null, answerFeedback: null };
  await sync();
  assert.equal(document.querySelector('.live-answer-sheet'), null, 'Moderator advancing dismisses the old explanation');
  state = { ...state, questionIndex: 0, answer: 'İstanbul', answerFeedback: null };

  state = { ...state, phase: 'reveal', question: { ...question, correctAnswer: 'Ankara' } };
  await sync();
  assert.ok(document.querySelector('.option-card.correct'));
  assert.ok(document.querySelector('.option-card.wrong'));
  assert.match(document.body.textContent, /Moderatörün devam etmesi bekleniyor/);
  await click([...document.querySelectorAll('button')].find(b => b.textContent === 'Ayrıl'));
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
  state = { ...state, phase: 'reveal', question: { ...question, correctAnswer: 'Ankara' } };
  await sync();
  await click([...document.querySelectorAll('button')].find(b => b.textContent === 'Düelloyu bitir'));
  assert.match(document.body.textContent, /Yarışma tamamlandı/);
  assert.match(document.body.textContent, /Berabere/);
  assert.equal(document.querySelectorAll('.live-ranking li').length, 2);
  console.log('PASS: participant form, persistent capability, original four-option bank question, individual-style option cards, 60-second display, immutable answer, right/wrong feedback, quit confirmation, moderator start/finish, final ranking');
} finally { if (root) await act(async () => root.unmount()); dom.window.close(); }
