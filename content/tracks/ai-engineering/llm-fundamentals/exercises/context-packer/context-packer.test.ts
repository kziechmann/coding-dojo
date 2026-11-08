import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { pack } = await loadSolution<typeof import('./starter.ts')>();

type Role = 'user' | 'assistant';
const msg = (role: Role, tokens: number, text = `${role}-${tokens}`) => ({ role, text, tokens });
const doc = (id: string, tokens: number, score: number) => ({ id, text: id, tokens, score });

// system 50 + question 50 + reserve 100: available = budget - 200
const base = {
  system: { text: 'You are helpful.', tokens: 50 },
  question: msg('user', 50, 'question'),
  reserveForOutput: 100,
};

test('throws when the fixed parts do not fit', () => {
  assert.throws(() => pack({ ...base, history: [], docs: [], budget: 150 }), RangeError);
});

test('includes everything when it all fits', () => {
  const history = [msg('user', 10), msg('assistant', 10)];
  const docs = [doc('a', 20, 0.5), doc('b', 20, 0.9)];
  const r = pack({ ...base, history, docs, budget: 1000 });
  assert.deepEqual(r.history, history);
  assert.deepEqual(r.docs.map((d) => d.id), ['b', 'a'], 'docs come back best score first');
  assert.equal(r.usedTokens, 50 + 50 + 20 + 40);
  assert.equal(r.droppedHistory, 0);
  assert.equal(r.droppedDocs, 0);
});

test('documents get at most half of the available space in the first pass', () => {
  const docs = [doc('big', 600, 0.9), doc('mid', 300, 0.8), doc('small', 200, 0.7)];
  const history = [msg('user', 50), msg('assistant', 50)];
  const r = pack({ ...base, history, docs, budget: 1200 }); // available 1000, doc cap 500
  assert.deepEqual(r.docs.map((d) => d.id), ['mid', 'small']);
  assert.equal(r.history.length, 2);
  assert.equal(r.droppedDocs, 1);
});

test('leftover space is spent on skipped documents in a second pass', () => {
  const docs = [doc('big', 600, 0.9)];
  const history = [msg('user', 50), msg('assistant', 50)];
  const r = pack({ ...base, history, docs, budget: 1200 });
  assert.deepEqual(r.docs.map((d) => d.id), ['big'], '600 > the 500 cap, but 900 tokens are left after history');
  assert.equal(r.usedTokens, 50 + 50 + 100 + 600);
});

test('history is the newest contiguous run and starts with a user turn', () => {
  const history = [msg('user', 300, 'u1'), msg('assistant', 300, 'a1'), msg('user', 50, 'u2'), msg('assistant', 50, 'a2')];
  const r = pack({ ...base, history, docs: [], budget: 600 }); // available 400
  assert.deepEqual(r.history.map((m) => m.text), ['u2', 'a2'], 'a1 fits but would start the history on an assistant turn');
  assert.equal(r.droppedHistory, 2);
  assert.equal(r.usedTokens, 50 + 50 + 100);
});

test('a message that does not fit blocks all older ones', () => {
  const history = [msg('user', 10, 'u1'), msg('assistant', 400, 'a1'), msg('user', 10, 'u2'), msg('assistant', 10, 'a2')];
  const r = pack({ ...base, history, docs: [], budget: 300 }); // available 100
  assert.deepEqual(r.history.map((m) => m.text), ['u2', 'a2']);
});

test('ties in score keep their original order', () => {
  const docs = [doc('first', 10, 0.5), doc('second', 10, 0.5), doc('third', 10, 0.5)];
  const r = pack({ ...base, history: [], docs, budget: 1000 });
  assert.deepEqual(r.docs.map((d) => d.id), ['first', 'second', 'third']);
});

test('skips a document that does not fit but keeps trying smaller ones', () => {
  const docs = [doc('a', 100, 0.9), doc('b', 400, 0.8), doc('c', 100, 0.7)];
  const r = pack({ ...base, history: [msg('user', 300), msg('assistant', 300)], docs, budget: 1000 }); // available 800, cap 400
  assert.deepEqual(r.docs.map((d) => d.id), ['a', 'c']);
  assert.equal(r.usedTokens, 50 + 50 + 600 + 200);
});

test('never exceeds the budget minus the output reserve', () => {
  const history = Array.from({ length: 30 }, (_, i) => msg(i % 2 ? 'assistant' : 'user', 17 + i));
  const docs = Array.from({ length: 20 }, (_, i) => doc(`d${i}`, 23 + i * 3, (i * 37) % 11));
  for (const budget of [400, 777, 1500]) {
    const r = pack({ ...base, history, docs, budget });
    assert.ok(r.usedTokens <= budget - base.reserveForOutput, `budget ${budget}: used ${r.usedTokens}`);
    if (r.history.length) assert.equal(r.history[0]!.role, 'user');
  }
});
