// Uses only the public client key. Supply fresh, disposable open and duel UUIDs.
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const [openId, duelId] = process.argv.slice(2);
const config = await readFile(new URL('../src/config.js', import.meta.url), 'utf8');
const url = process.env.TEST_SUPABASE_URL || config.match(/url:.*?'(https:[^']+)'/)[1];
const key = process.env.TEST_SUPABASE_KEY || config.match(/publishableKey:.*?'([^']+)'/)[1];
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tokens = Array.from({ length: 3 }, () => randomUUID());
const rpc = async (id, action = 'state', token = null, payload = {}) => {
  const { data, error } = await client.rpc('live_quiz', { p_session_id: id, p_action: action, p_token: token, p_payload: payload });
  if (error) throw new Error(error.message);
  return data;
};
const join = (id, i) => rpc(id, 'join', tokens[i], { fullName: `API Test ${i + 1}`, store: 'Test', ownerUid: `test_${tokens[i]}` });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const duelJoins = await Promise.allSettled(tokens.map((_, i) => join(duelId, i)));
assert.equal(duelJoins.filter(r => r.status === 'fulfilled').length, 2, 'Atomic capacity check');
assert.equal(duelJoins.filter(r => r.status === 'rejected').length, 1);
await assert.rejects(rpc(duelId, 'next', tokens[0], { phase: 'lobby', questionIndex: 0 }), /Moderatör/);
console.log('PASS: concurrent duel joins admit exactly two; guest moderation rejected');

const joined = await Promise.all([join(openId, 0), join(openId, 1)]);
assert.equal(joined[0].deadline, joined[1].deadline, 'Concurrent joins reset the lobby');
assert.equal((await join(openId, 0)).participantCount, 2, 'Retry duplicates participant');
console.log('OPEN_API_LOBBY_READY');
let st;
for (let i = 0; i < 75; i++) {
  st = await rpc(openId, 'state', tokens[0]);
  if (st.phase === 'question') break;
  await delay(1000);
}
assert.equal(st.phase, 'question');
assert.equal(Object.hasOwn(st.question, 'correctAnswer'), false);
const second = await rpc(openId, 'state', tokens[1]);
assert.equal(st.deadline, second.deadline);
assert.equal(st.question.id, second.question.id);
await assert.rejects(join(openId, 2), /katılım kapalı/);
const responses = await Promise.all([
  rpc(openId, 'answer', tokens[0], { questionIndex: 0, answer: st.question.options[0] }),
  rpc(openId, 'answer', tokens[1], { questionIndex: 0, answer: st.question.options[1] }),
]);
assert.ok(responses.some(r => r.phase === 'reveal'));
const revealed = await rpc(openId, 'state', tokens[0]);
assert.equal(revealed.phase, 'reveal');
assert.ok(revealed.question.correctAnswer);
assert.equal((await rpc(openId, 'state', tokens[1])).phase, 'reveal');
console.log('PASS: shared deadline/order; no answer key before reveal; concurrent last answers close question');
await delay(4500);
const results = await Promise.all([rpc(openId, 'state', tokens[0]), rpc(openId, 'state', tokens[1])]);
assert.ok(results.every(r => r.phase === 'finished' && r.resultId));
assert.notEqual(results[0].resultId, results[1].resultId);
assert.equal((await rpc(openId, 'state', tokens[0])).resultId, results[0].resultId);
console.log('PASS: independent results, idempotent finalization; real public REST API');
