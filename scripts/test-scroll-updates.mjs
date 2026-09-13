import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const { JSDOM } = await import(process.env.JSDOM_MODULE || '/tmp/quizup-dom-test/node_modules/jsdom/lib/api.js');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://quizup.test/', pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
globalThis.React = React;
const notices = [];
Object.assign(globalThis, {
  Page: ({ children, extra }) => React.createElement('main', null, extra, children),
  getCurrentUser: () => ({ companyId: 'company' }),
  useAnimatedPlaceholder: () => 'Soru ara', sanitizeHTML: s => s || '',
  typeLabel: () => 'Çoktan seçmeli', fmtDate: () => '', toast: (...args) => notices.push(args),
  LoadingSpinner: () => null,
  validateQuestion: () => ({}),
  AdminForm: ({ reset, handleSave }) => React.createElement(React.Fragment, null, React.createElement('button', { onClick: reset }, 'Vazgeç'), React.createElement('button', { onClick: handleSave }, 'Kaydet')),
});
window.devError = () => {};
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLDialogElement.prototype.close = function () { this.open = false; };
let snapshot, resolveUpdate, rejectUpdate;
const writes = [];
const question = { id: 'q1', questionText: 'Deneme sorusu', type: 'mcq', options: ['A', 'B'], correctAnswer: 'A', isActive: true };
window.db = {
  onQuestionsSnapshot: (_, cb) => { snapshot = cb; cb([question]); return () => {}; },
  updateQuestion: (id, data) => { writes.push(data); return new Promise((resolve, reject) => { resolveUpdate = resolve; rejectUpdate = reject; }); },
  addQuestion: async data => { writes.push(data); return { ...data, id: 'q2', order: 1 }; },
};
for (const name of ['questionlist', 'admin', 'ScrollToTop']) {
  const source = await readFile(`components/${name}.jsx`, 'utf8');
  for (const icon of new Set(source.match(/\b[A-Z]\w*Icon\b/g))) globalThis[icon] = () => null;
  new Function((await transform(source, { loader: 'jsx', format: 'iife' })).code)();
  if (name === 'questionlist') globalThis.QuestionList = window.QuestionList;
}
const root = createRoot(document.getElementById('root'));
const click = node => act(async () => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.includes(text));
const scrollCalls = [];
window.scrollTo = args => scrollCalls.push(args);
try {
  await act(async () => root.render(React.createElement(window.Admin)));
  const checkbox = document.querySelector('.toggle-switch input');
  const card = checkbox.closest('.card');
  await click(checkbox);
  assert.equal(checkbox.checked, false, 'Optimistic result before the server responds');
  assert.equal(checkbox.disabled, true);
  assert.equal(document.querySelector('.toggle-switch input'), checkbox, 'Card must not remount');
  await act(async () => snapshot([question]));
  assert.equal(checkbox.checked, false, 'Stale polling cannot overwrite pending result');
  await act(async () => resolveUpdate());
  assert.equal(checkbox.disabled, false);
  await act(async () => snapshot([{ ...question, isActive: false }]));
  await click(checkbox);
  assert.equal(checkbox.checked, true);
  await act(async () => rejectUpdate(new Error('Offline')));
  assert.equal(checkbox.checked, false, 'Failed write restores previous value');
  assert.ok(notices.some(([text]) => text.includes('önceki duruma')));
  await click(button('Düzenle'));
  assert.ok(document.querySelector('dialog').open);
  assert.equal(checkbox.closest('.card'), card);
  assert.ok(card.isConnected, 'Opening editor keeps background list mounted');
  await click(button('Vazgeç'));
  assert.equal(document.querySelector('.toggle-switch input'), checkbox);
  await click(button('Düzenle'));
  await click(button('Kaydet'));
  await act(async () => resolveUpdate({ ...question, questionText: 'Güncellenen soru', isActive: false }));
  assert.equal(document.querySelector('dialog'), null);
  assert.equal(document.querySelector('.toggle-switch input'), checkbox);
  assert.ok(card.textContent.includes('Güncellenen soru'), 'Saved edit appears without waiting for polling');
  await click(button('Yeni Soru'));
  await click(button('Kaydet'));
  assert.equal(document.querySelectorAll('.toggle-switch input').length, 2, 'Creating needs no manual number');
  assert.ok(writes.every(data => !('order' in data) && !('orderNumber' in data)), 'Numbers are assigned by the server for create and edit');
  assert.equal(scrollCalls.length, 0, 'CRUD does not request a jump to top');

  await act(async () => root.render(React.createElement(window.ScrollToTop)));
  const flushScroll = async target => act(async () => {
    target.dispatchEvent(new window.Event('scroll'));
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  await flushScroll(window);
  assert.equal(document.querySelector('.scroll-to-top-btn'), null);
  window.scrollY = 350;
  await flushScroll(window);
  assert.ok(document.querySelector('.scroll-to-top-btn'));
  assert.equal(scrollCalls.length, 0, 'Scrolling never automatically jumps up');
  await click(document.querySelector('.scroll-to-top-btn'));
  assert.deepEqual(scrollCalls, [{ top: 0, behavior: 'smooth' }]);
  window.scrollY = 0;
  await flushScroll(window);
  assert.equal(document.querySelector('.scroll-to-top-btn'), null);
  const inner = document.createElement('div');
  inner.className = 'quiz-content';
  inner.scrollTop = 400;
  const innerCalls = [];
  inner.scrollTo = args => innerCalls.push(args);
  document.body.append(inner);
  window.matchMedia = () => ({ matches: true });
  await flushScroll(inner);
  await click(document.querySelector('.scroll-to-top-btn'));
  assert.deepEqual(innerCalls, [{ top: 0, behavior: 'auto' }]);
  console.log('PASS: immediate toggle, stale polling guard, rollback, stable cards/editor, no CRUD scroll, threshold chevron, nested scrolling and reduced motion');
} finally {
  await act(async () => root.unmount());
  dom.window.close();
}
