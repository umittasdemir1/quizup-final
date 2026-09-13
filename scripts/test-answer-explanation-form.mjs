import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const { JSDOM } = await import(process.env.JSDOM_MODULE || '/tmp/quizup-dom-test/node_modules/jsdom/lib/api.js');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://quizup.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
globalThis.React = React;
const helpers = await readFile('utils/helpers.js', 'utf8');
globalThis.validateQuestion = new Function(`${helpers.match(/const validateQuestion = [\s\S]*?\n};/)[0]}; return validateQuestion;`)();
Object.assign(globalThis, {
  Page: ({ children, extra }) => React.createElement('main', null, extra, children),
  getCurrentUser: () => ({ companyId: 'company' }),
  useAnimatedPlaceholder: () => '', sanitizeHTML: s => s || '', typeLabel: () => 'Test', fmtDate: () => '', toast: () => {}, LoadingSpinner: () => null,
});
window.devError = (...args) => { throw new Error(args.join(' ')); };
window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLDialogElement.prototype.close = function () { this.open = false; };
let saved;
const q = { id: 'q1', questionText: 'Luca modeli 4.400 TL’dir.', type: 'mcq', category: 'Ürün', difficulty: 'easy', options: ['Doğru', 'Yanlış'], correctAnswer: 'Doğru', isActive: true, answerExplanation: '' };
window.db = {
  onQuestionsSnapshot: (_, cb) => { cb([q]); return () => {}; },
  updateQuestion: async (id, data) => { saved = data; return { ...q, ...data }; },
};
for (const name of ['questionlist', 'adminform', 'admin']) {
  const source = await readFile(`components/${name}.jsx`, 'utf8');
  for (const icon of new Set(source.match(/\b[A-Z]\w*Icon\b/g))) globalThis[icon] = () => null;
  new Function((await transform(source, { loader: 'jsx', format: 'iife' })).code)();
  globalThis.QuestionList = window.QuestionList;
  globalThis.AdminForm = window.AdminForm;
}
const root = createRoot(document.getElementById('root'));
const click = el => act(async () => { assert.ok(el); el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.includes(text));
try {
  await act(async () => root.render(React.createElement(window.Admin)));
  await click(button('Düzenle'));
  assert.equal(document.querySelector('#answer-explanation'), null);
  await click(document.querySelector('#answer-explanation-toggle'));
  await click(button('Güncelle'));
  assert.ok(document.querySelector('#answer-explanation-field [role="alert"]'));
  assert.equal(saved, undefined, 'Enabled empty explanation cannot be saved');
  const textarea = document.querySelector('#answer-explanation');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Luca modelinin doğru fiyatı 4.400 TL’dir.');
    textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await click(button('Güncelle'));
  assert.equal(saved.answerExplanation, 'Luca modelinin doğru fiyatı 4.400 TL’dir.');
  await click(button('Düzenle'));
  assert.equal(document.querySelector('#answer-explanation-toggle').checked, true);
  assert.equal(document.querySelector('#answer-explanation').value, saved.answerExplanation);
  await click(document.querySelector('#answer-explanation-toggle'));
  await click(button('Güncelle'));
  assert.equal(saved.answerExplanation, '', 'Disabling removes the saved explanation');
  await click(button('Yeni Soru'));
  assert.equal(document.querySelector('#answer-explanation-toggle').checked, false);
  assert.equal(document.querySelector('#answer-explanation'), null);
  assert.ok(validateQuestion({ ...q, hasAnswerExplanation: true, answerExplanation: 'x'.repeat(2001) }).answerExplanation);
  console.log('PASS: real question form, optional toggle, required/length validation, save/edit round trip, disabling clears text, new form resets');
} finally { await act(async () => root.unmount()); dom.window.close(); }
