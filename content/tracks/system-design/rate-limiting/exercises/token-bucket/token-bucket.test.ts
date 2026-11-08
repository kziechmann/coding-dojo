import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakeClock, loadSolution } from '../../../../../_lib/harness.ts';

const { TokenBucket } = await loadSolution<typeof import('./starter.ts')>();

const make = (capacity = 10, refillPerSecond = 5) => {
  const clock = fakeClock(1_000_000);
  return { clock, bucket: new TokenBucket({ capacity, refillPerSecond, clock: clock.now }) };
};

test('starts full and rejects once empty', () => {
  const { bucket } = make();
  for (let i = 0; i < 10; i++) assert.equal(bucket.tryRemove(), true, `request ${i + 1}`);
  assert.equal(bucket.tryRemove(), false);
});

test('refills at the configured rate', () => {
  const { bucket, clock } = make();
  for (let i = 0; i < 10; i++) bucket.tryRemove();
  clock.advance(200);
  assert.equal(bucket.tryRemove(), true, 'one token after 200 ms at 5/s');
  assert.equal(bucket.tryRemove(), false);
});

test('never holds more than capacity', () => {
  const { bucket, clock } = make();
  bucket.tryRemove();
  clock.advance(60_000);
  assert.equal(bucket.available(), 10);
});

test('accumulates fractional tokens', () => {
  const { bucket, clock } = make();
  for (let i = 0; i < 10; i++) bucket.tryRemove();
  clock.advance(100);
  clock.advance(100);
  clock.advance(100);
  assert.ok(Math.abs(bucket.available() - 1.5) < 1e-9, `expected 1.5 tokens, got ${bucket.available()}`);
  assert.equal(bucket.tryRemove(), true);
  assert.equal(bucket.tryRemove(), false);
});

test('a multi-token request is all or nothing', () => {
  const { bucket } = make(3, 1);
  assert.equal(bucket.tryRemove(2), true);
  assert.equal(bucket.tryRemove(2), false, 'only 1 token left');
  assert.equal(bucket.available(), 1, 'the failed request must not spend tokens');
});

test('retryAfterMs tells the caller when to come back', () => {
  const { bucket } = make();
  assert.equal(bucket.retryAfterMs(), 0);
  for (let i = 0; i < 10; i++) bucket.tryRemove();
  assert.equal(bucket.retryAfterMs(), 200);
  assert.equal(bucket.retryAfterMs(2), 400);
  assert.equal(bucket.retryAfterMs(11), Infinity, 'more than capacity can never pass');
});

test('a bucket with no refill never recovers', () => {
  const { bucket } = make(1, 0);
  bucket.tryRemove();
  assert.equal(bucket.retryAfterMs(), Infinity);
});

test('a clock that goes backwards adds no tokens', () => {
  const { bucket, clock } = make();
  for (let i = 0; i < 10; i++) bucket.tryRemove();
  clock.advance(-5_000);
  assert.equal(bucket.tryRemove(), false);
  clock.advance(200);
  assert.equal(bucket.tryRemove(), true, 'refill resumes from the new time');
});

test('rejects invalid configuration', () => {
  assert.throws(() => new TokenBucket({ capacity: 0, refillPerSecond: 1 }), RangeError);
  assert.throws(() => new TokenBucket({ capacity: 5, refillPerSecond: -1 }), RangeError);
});
