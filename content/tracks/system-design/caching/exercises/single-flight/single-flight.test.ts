import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fakeClock, loadSolution } from '../../../../../_lib/harness.ts';

const { SingleFlight, cachedLoader } = await loadSolution<typeof import('./starter.ts')>();

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('SingleFlight', () => {
  test('concurrent calls for one key share a single execution', async () => {
    const sf = new SingleFlight<number>();
    let calls = 0;
    const d = deferred<number>();
    const results = Array.from({ length: 100 }, () =>
      sf.do('a', () => {
        calls++;
        return d.promise;
      }),
    );
    d.resolve(42);
    assert.deepEqual(new Set(await Promise.all(results)), new Set([42]));
    assert.equal(calls, 1);
  });

  test('different keys run independently', async () => {
    const sf = new SingleFlight<string>();
    let calls = 0;
    const [a, b] = await Promise.all([
      sf.do('a', async () => (calls++, 'A')),
      sf.do('b', async () => (calls++, 'B')),
    ]);
    assert.equal(a, 'A');
    assert.equal(b, 'B');
    assert.equal(calls, 2);
  });

  test('forgets a key once it settles', async () => {
    const sf = new SingleFlight<number>();
    let calls = 0;
    await sf.do('a', async () => ++calls);
    await sf.do('a', async () => ++calls);
    assert.equal(calls, 2);
  });

  test('a rejection reaches every waiter and is not remembered', async () => {
    const sf = new SingleFlight<number>();
    const d = deferred<number>();
    const waiters = [sf.do('a', () => d.promise), sf.do('a', () => d.promise)];
    d.reject(new Error('db down'));
    for (const w of waiters) await assert.rejects(w, /db down/);
    assert.equal(await sf.do('a', async () => 7), 7);
  });

  test('inFlight counts keys that are loading', async () => {
    const sf = new SingleFlight<number>();
    const d1 = deferred<number>();
    const d2 = deferred<number>();
    const p1 = sf.do('a', () => d1.promise);
    const p2 = sf.do('b', () => d2.promise);
    sf.do('a', () => d1.promise);
    assert.equal(sf.inFlight(), 2);
    d1.resolve(1);
    d2.resolve(2);
    await Promise.all([p1, p2]);
    assert.equal(sf.inFlight(), 0);
  });

  test('a synchronous throw becomes a rejection and frees the key', async () => {
    const sf = new SingleFlight<number>();
    let p: Promise<number> | undefined;
    assert.doesNotThrow(() => {
      p = sf.do('a', () => {
        throw new Error('boom');
      });
    });
    await assert.rejects(p!, /boom/);
    assert.equal(sf.inFlight(), 0);
  });
});

describe('cachedLoader', () => {
  test('a cold stampede triggers one load', async () => {
    const d = deferred<string>();
    const loader = cachedLoader<string>({ load: () => d.promise, ttlMs: 1000, clock: fakeClock(0).now });
    const gets = Array.from({ length: 50 }, () => loader.get('k'));
    d.resolve('v');
    assert.deepEqual(new Set(await Promise.all(gets)), new Set(['v']));
    assert.equal(loader.loadCount(), 1);
  });

  test('serves from cache until the TTL passes, then reloads once', async () => {
    const clock = fakeClock(0);
    let n = 0;
    const loader = cachedLoader<number>({ load: async () => ++n, ttlMs: 1000, clock: clock.now });
    assert.equal(await loader.get('k'), 1);
    clock.advance(999);
    assert.equal(await loader.get('k'), 1);
    clock.advance(1);
    const again = await Promise.all(Array.from({ length: 20 }, () => loader.get('k')));
    assert.deepEqual(new Set(again), new Set([2]));
    assert.equal(loader.loadCount(), 2);
  });

  test('errors are not cached', async () => {
    let fail = true;
    const loader = cachedLoader<string>({
      load: async () => {
        if (fail) throw new Error('timeout');
        return 'ok';
      },
      ttlMs: 1000,
      clock: fakeClock(0).now,
    });
    await assert.rejects(loader.get('k'), /timeout/);
    fail = false;
    assert.equal(await loader.get('k'), 'ok');
    assert.equal(loader.loadCount(), 2);
  });

  test('keys are cached separately', async () => {
    const loader = cachedLoader<string>({ load: async (k) => k.toUpperCase(), ttlMs: 1000, clock: fakeClock(0).now });
    assert.equal(await loader.get('a'), 'A');
    assert.equal(await loader.get('b'), 'B');
    assert.equal(await loader.get('a'), 'A');
    assert.equal(loader.loadCount(), 2);
  });
});
