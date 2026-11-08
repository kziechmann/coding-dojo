import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakeClock, loadSolution } from '../../../../../_lib/harness.ts';

const { LruCache } = await loadSolution<typeof import('./starter.ts')>();

test('stores and returns values; misses return undefined', () => {
  const cache = new LruCache<number>({ maxEntries: 3 });
  cache.set('a', 1);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('zzz'), undefined);
});

test('evicts the least recently used entry', () => {
  const cache = new LruCache<number>({ maxEntries: 2 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.get('a');
  cache.set('c', 3);
  assert.equal(cache.get('b'), undefined, 'b was least recently used');
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('c'), 3);
});

test('setting an existing key updates it without evicting', () => {
  const cache = new LruCache<number>({ maxEntries: 2 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('a', 10);
  cache.set('c', 3);
  assert.equal(cache.get('a'), 10);
  assert.equal(cache.get('b'), undefined, 'updating a made b the oldest');
  assert.equal(cache.stats().evictions, 1);
});

test('entries expire at set time + TTL', () => {
  const clock = fakeClock(0);
  const cache = new LruCache<string>({ maxEntries: 10, defaultTtlMs: 1000, clock: clock.now });
  cache.set('k', 'v');
  clock.advance(999);
  assert.equal(cache.get('k'), 'v');
  clock.advance(1);
  assert.equal(cache.get('k'), undefined);
});

test('per-entry TTL overrides the default; no TTL means no expiry', () => {
  const clock = fakeClock(0);
  const short = new LruCache<string>({ maxEntries: 10, defaultTtlMs: 10_000, clock: clock.now });
  short.set('fast', 'x', 100);
  short.set('slow', 'y');
  clock.advance(500);
  assert.equal(short.get('fast'), undefined);
  assert.equal(short.get('slow'), 'y');

  const forever = new LruCache<string>({ maxEntries: 10, clock: clock.now });
  forever.set('k', 'v');
  clock.advance(10 ** 9);
  assert.equal(forever.get('k'), 'v');
});

test('has() does not change recency or stats', () => {
  const cache = new LruCache<number>({ maxEntries: 2 });
  cache.set('a', 1);
  cache.set('b', 2);
  assert.equal(cache.has('a'), true);
  cache.set('c', 3);
  assert.equal(cache.has('a'), false, 'has() must not have refreshed a');
  assert.deepEqual(cache.stats(), { hits: 0, misses: 0, evictions: 1 });
});

test('size counts only live entries; delete reports whether a key existed', () => {
  const clock = fakeClock(0);
  const cache = new LruCache<number>({ maxEntries: 10, clock: clock.now });
  cache.set('a', 1, 100);
  cache.set('b', 2);
  assert.equal(cache.size, 2);
  clock.advance(100);
  assert.equal(cache.size, 1);
  assert.equal(cache.delete('b'), true);
  assert.equal(cache.delete('b'), false);
  assert.equal(cache.size, 0);
});

test('stats count hits, misses and capacity evictions', () => {
  const clock = fakeClock(0);
  const cache = new LruCache<number>({ maxEntries: 1, clock: clock.now });
  cache.set('a', 1, 10);
  cache.get('a');
  cache.get('nope');
  clock.advance(10);
  cache.get('a');
  cache.set('b', 2);
  cache.set('c', 3);
  assert.deepEqual(cache.stats(), { hits: 1, misses: 2, evictions: 1 });
});

test('rejects a capacity below 1', () => {
  assert.throws(() => new LruCache({ maxEntries: 0 }), RangeError);
});

test('get and set are O(1): 200,000 operations on a 10,000-entry cache', () => {
  const cache = new LruCache<number>({ maxEntries: 10_000 });
  const start = performance.now();
  for (let i = 0; i < 200_000; i++) {
    cache.set(`k${i % 15_000}`, i);
    cache.get(`k${(i * 7) % 15_000}`);
  }
  const ms = performance.now() - start;
  assert.ok(ms < 1500, `took ${Math.round(ms)} ms; look for a linear scan`);
});
