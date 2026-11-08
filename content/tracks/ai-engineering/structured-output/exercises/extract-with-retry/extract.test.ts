import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { parseJsonLoose, extract, ExtractionError } = await loadSolution<typeof import('./starter.ts')>();

type Msg = { role: 'user' | 'assistant'; content: string };

/** A fake model that replies from a script and records a snapshot of every conversation it saw. */
function scripted(replies: string[]) {
  const seen: Msg[][] = [];
  const model = async (messages: Msg[]) => {
    seen.push(structuredClone(messages));
    const reply = replies[seen.length - 1];
    if (reply === undefined) throw new Error('the script ran out of replies');
    return reply;
  };
  return { model, seen };
}

type Score = { home: number; away: number };
const validateScore = (v: unknown) => {
  const errors: string[] = [];
  const o = (v ?? {}) as Record<string, unknown>;
  for (const k of ['home', 'away']) {
    if (!Number.isInteger(o[k]) || (o[k] as number) < 0) errors.push(`${k} must be a non-negative integer`);
  }
  return errors.length ? { ok: false as const, errors } : { ok: true as const, value: o as unknown as Score };
};

describe('parseJsonLoose', () => {
  test('parses plain JSON', () => {
    assert.deepEqual(parseJsonLoose('{"a": 1}'), { a: 1 });
  });

  test('parses a fenced block, with or without a language tag', () => {
    assert.deepEqual(parseJsonLoose('Here you go:\n```json\n{"a": [1, 2]}\n```\nAnything else?'), { a: [1, 2] });
    assert.deepEqual(parseJsonLoose('```\n[1, 2, 3]\n```'), [1, 2, 3]);
  });

  test('ignores prose around the JSON', () => {
    assert.deepEqual(parseJsonLoose('Sure! {"team": "Canada", "score": {"home": 2}} Hope that helps.'), { team: 'Canada', score: { home: 2 } });
  });

  test('handles a top-level array that comes before any object', () => {
    assert.deepEqual(parseJsonLoose('Results: [{"id": 1}, {"id": 2}]'), [{ id: 1 }, { id: 2 }]);
  });

  test('throws SyntaxError when there is no JSON', () => {
    assert.throws(() => parseJsonLoose('I cannot help with that.'), SyntaxError);
    assert.throws(() => parseJsonLoose('{"a": 1,,}'), SyntaxError);
  });
});

describe('extract', () => {
  test('returns on the first valid reply', async () => {
    const { model, seen } = scripted(['{"home": 2, "away": 1}']);
    const r = await extract(model, 'Extract the score', validateScore);
    assert.deepEqual(r.value, { home: 2, away: 1 });
    assert.equal(r.attempts, 1);
    assert.equal(seen.length, 1);
    assert.deepEqual(seen[0], [{ role: 'user', content: 'Extract the score' }]);
  });

  test('feeds invalid JSON back and retries', async () => {
    const { model, seen } = scripted(['{"home": 2, "away": }', '{"home": 2, "away": 1}']);
    const r = await extract(model, 'Extract the score', validateScore);
    assert.equal(r.attempts, 2);
    const second = seen[1]!;
    assert.equal(second.length, 3);
    assert.deepEqual(second[1], { role: 'assistant', content: '{"home": 2, "away": }' });
    assert.equal(second[2]!.role, 'user');
    assert.match(second[2]!.content, /Invalid JSON/);
  });

  test('feeds every validation error back', async () => {
    const { model, seen } = scripted(['{"home": "2", "away": -1}', '{"home": 2, "away": 0}']);
    const r = await extract(model, 'Extract the score', validateScore);
    assert.deepEqual(r.value, { home: 2, away: 0 });
    const repair = seen[1]![2]!.content;
    assert.match(repair, /home must be a non-negative integer/);
    assert.match(repair, /away must be a non-negative integer/);
  });

  test('returns the whole conversation', async () => {
    const { model } = scripted(['nope', '{"home": 1, "away": 1}']);
    const r = await extract(model, 'p', validateScore);
    assert.deepEqual(r.messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant']);
  });

  test('gives up after maxAttempts with an ExtractionError', async () => {
    const { model, seen } = scripted(['{}', '{"home": 1}', '{"away": 1}']);
    await assert.rejects(extract(model, 'p', validateScore), (err: unknown) => {
      assert.ok(err instanceof ExtractionError, 'should throw ExtractionError');
      assert.equal(err.attempts, 3);
      assert.deepEqual(err.lastErrors, ['home must be a non-negative integer']);
      return true;
    });
    assert.equal(seen.length, 3);
  });

  test('respects a custom maxAttempts', async () => {
    const { model, seen } = scripted(['bad', 'bad', 'bad']);
    await assert.rejects(extract(model, 'p', validateScore, { maxAttempts: 1 }), ExtractionError);
    assert.equal(seen.length, 1);
  });
});
