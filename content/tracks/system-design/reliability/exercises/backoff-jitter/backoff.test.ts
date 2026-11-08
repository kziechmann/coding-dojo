import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { backoffDelay, retry } = await loadSolution<typeof import('./starter.ts')>();

const opts = { baseMs: 100, maxMs: 2000 };

describe('backoffDelay', () => {
  test('doubles from the base and caps at the max', () => {
    const none = { ...opts, jitter: 'none' as const };
    assert.deepEqual([1, 2, 3, 6, 7, 30].map((a) => backoffDelay(a, none)), [100, 200, 400, 2000, 2000, 2000]);
  });

  test('full jitter spans 0 up to the backoff', () => {
    const full = { ...opts, jitter: 'full' as const };
    assert.equal(backoffDelay(3, full, () => 0), 0);
    assert.equal(backoffDelay(3, full, () => 0.5), 200);
    assert.equal(backoffDelay(3, full, () => 0.999), 399);
  });

  test('equal jitter keeps at least half the backoff', () => {
    const equal = { ...opts, jitter: 'equal' as const };
    assert.equal(backoffDelay(3, equal, () => 0), 200);
    assert.equal(backoffDelay(3, equal, () => 0.5), 300);
    assert.equal(backoffDelay(3, equal, () => 0.999), 399);
  });

  test('rejects attempt numbers below 1', () => {
    assert.throws(() => backoffDelay(0, { ...opts, jitter: 'none' }), RangeError);
  });
});

describe('retry', () => {
  const base = { ...opts, jitter: 'none' as const };

  test('retries failures with backoff and returns the eventual value', async () => {
    const sleeps: number[] = [];
    const seen: number[] = [];
    const value = await retry(
      async (attempt) => {
        seen.push(attempt);
        if (attempt < 3) throw new Error(`fail ${attempt}`);
        return 'ok';
      },
      { ...base, maxAttempts: 5, sleep: async (ms) => void sleeps.push(ms) },
    );
    assert.equal(value, 'ok');
    assert.deepEqual(seen, [1, 2, 3]);
    assert.deepEqual(sleeps, [100, 200]);
  });

  test('gives up after maxAttempts with the last error, without a final sleep', async () => {
    const sleeps: number[] = [];
    let calls = 0;
    await assert.rejects(
      retry(
        async (attempt) => {
          calls++;
          throw new Error(`fail ${attempt}`);
        },
        { ...base, maxAttempts: 3, sleep: async (ms) => void sleeps.push(ms) },
      ),
      /fail 3/,
    );
    assert.equal(calls, 3);
    assert.deepEqual(sleeps, [100, 200]);
  });

  test('does not retry errors that are not retryable', async () => {
    let calls = 0;
    const sleeps: number[] = [];
    await assert.rejects(
      retry(
        async () => {
          calls++;
          throw Object.assign(new Error('bad request'), { status: 400 });
        },
        {
          ...base,
          maxAttempts: 5,
          isRetryable: (e) => (e as { status?: number }).status !== 400,
          sleep: async (ms) => void sleeps.push(ms),
        },
      ),
      /bad request/,
    );
    assert.equal(calls, 1);
    assert.deepEqual(sleeps, []);
  });

  test('uses the injected random source for jitter', async () => {
    const sleeps: number[] = [];
    await retry(
      async (attempt) => {
        if (attempt < 3) throw new Error('x');
        return 1;
      },
      { ...opts, jitter: 'full', maxAttempts: 3, random: () => 0.5, sleep: async (ms) => void sleeps.push(ms) },
    );
    assert.deepEqual(sleeps, [50, 100]);
  });

  test('rejects maxAttempts below 1', async () => {
    await assert.rejects(retry(async () => 1, { ...base, maxAttempts: 0 }), RangeError);
  });
});
