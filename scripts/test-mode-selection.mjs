// Exercise the real Manager form with isolated question/package fixtures.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
const { JSDOM } = await import(process.env.JSDOM_MODULE || '/tmp/quizup-dom-test/node_modules/jsdom/lib/api.js');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://quizup.test/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, location: dom.window.location, IS_REACT_ACT_ENVIRONMENT: true });
const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
globalThis.React = React;
const source = await readFile('components/manager.jsx', 'utf8');
const helper = (await readFile('utils/helpers.js', 'utf8')).match(/const validateSession = [\s\S]*?\n};/)[0];
const validateSession = new Function(`${helper}; return validateSession;`)();
const qids = ['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'];
const user = { uid: 'manager', role: 'admin', companyId: 'test-company', applicationPin: '1234' };
const captured = [];
Object.assign(globalThis, {
  Page: ({ children, title, extra }) => React.createElement('section', null, title, extra, children),
  getCurrentUser: () => user, useAnimatedPlaceholder: () => '', validateSession,
  toast: () => {}, fmtDate: () => '', typeLabel: () => 'Çoktan seçmeli',
  QRCode: function () {}, LoadingSpinner: () => null,
});
for (const icon of new Set(source.match(/\b[A-Z]\w*Icon\b/g))) globalThis[icon] = () => null;
window.devError = e => { throw e; };
window.db = {
  onSessionsSnapshot: (_, cb) => { cb([]); return () => {}; },
  onQuestionsSnapshot: (_, cb) => { cb(qids.map((id, i) => ({ id, questionText: `Havuz sorusu ${i + 1}`, type: 'mcq', isActive: true, options: ['A', 'B'], correctAnswer: 'A' }))); return () => {}; },
  onPackagesSnapshot: (_, __, cb) => { cb([{ id: 'package', name: 'Havuz Paketi', questionIds: qids, questionCount: 2, createdBy: user.uid }]); return () => {}; },
  addSession: async (data, company) => { captured.push({ data, company }); return { id: 'session' }; },
};
new Function((await transform(source, { loader: 'jsx', format: 'iife', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' })).code)();
const root = createRoot(document.getElementById('root'));
const click = node => act(async () => { assert.ok(node); node.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.includes(text));
try {
  await act(async () => root.render(React.createElement(window.Manager)));
  await click(button('Yeni Quiz'));
  assert.equal(document.querySelectorAll('.session-type-card').length, 4);
  await click(button('Havuz Paketi'));
  for (const mode of [...document.querySelectorAll('.session-type-card')]) {
    await click(mode);
    assert.equal(document.querySelectorAll('.session-type-card.active').length, 1);
    assert.ok([...mode.children].every((el, i) => el.className === ['session-type-icon', 'session-type-title', 'session-type-desc'][i]));
    assert.ok(document.body.textContent.includes('Hızlı Paketler'));
    assert.equal(document.querySelectorAll('label.option-card input:checked').length, 2);
    assert.equal(document.querySelectorAll('textarea').length, 0, 'No separate duel authoring form');
  }
  await click(document.querySelector('label.option-card input'));
  assert.equal(document.querySelector('.package-chip.active'), null, 'Manual selection clears stale package tag');
  await click(button('Havuz Paketi'));
  await click(button('Oluştur & QR Göster'));
  assert.equal(captured[0].data.sessionMode, 'duel');
  assert.deepEqual(captured[0].data.questionIds, qids);
  assert.equal('statements' in captured[0].data, false);
  assert.ok(document.querySelector('a[href="#/moderate/session"]'));
  await click(button('Yeni Quiz Oluştur'));
  await click(button('Yeni Quiz'));
  assert.equal(document.querySelector('.package-chip.active'), null);
  assert.equal(document.querySelectorAll('label.option-card input:checked').length, 0);
  assert.ok(validateSession({ sessionMode: 'duel', questionIds: [] }).questions);
  assert.deepEqual(validateSession({ sessionMode: 'duel', questionIds: qids }), {});
  console.log('PASS: four matching mode cards, common bank/package selector, selection retained across modes, stale package reset, duel sends original question IDs');
} finally { await act(async () => root.unmount()); dom.window.close(); }
