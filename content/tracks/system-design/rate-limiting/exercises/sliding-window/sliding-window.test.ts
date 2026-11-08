import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fakeClock, loadSolution } from '../../../../../_lib/harness.ts';

const { FixedWindowLimiter, SlidingWindowCounter } = await loadSolution<typeof import('./starter.ts')>();

const count = (allow: () => boolean, n: number) => Array.from({ length: n }, allow).filter(Boolean).length;

describe('FixedWindowLimiter', () => {
  test('allows up to the limit per window', () => {
    const clock = fakeClock(0);
    const lim = new FixedWindowLimiter({ limit: 5, windowMs: 1000, clock: clock.now });
    assert.equal(count(() => lim.allow('a'), 8), 5);
  });

  test('resets at the aligned window boundary', () => {
    const clock = fakeClock(500);
    const lim = new FixedWindowLimiter({ limit: 5, windowMs: 1000, clock: clock.now });
    assert.equal(count(() => lim.allow('a'), 5), 5);
    clock.set(999);
    assert.equal(lim.allow('a'), false);
    clock.set(1000);
    assert.equal(lim.allow('a'), true, 'a new window starts at t=1000');
  });

  test('keys are independent', () => {
    const lim = new FixedWindowLimiter({ limit: 1, windowMs: 1000, clock: fakeClock(0).now });
    assert.equal(lim.allow('a'), true);
    assert.equal(lim.allow('b'), true);
    assert.equal(lim.allow('a'), false);
  });

  test('lets a burst of 2x the limit through across a boundary (the known flaw)', () => {
    const clock = fakeClock(999);
    const lim = new FixedWindowLimiter({ limit: 10, windowMs: 1000, clock: clock.now });
    const first = count(() => lim.allow('a'), 10);
    clock.set(1001);
    const second = count(() => lim.allow('a'), 10);
    assert.equal(first + second, 20);
  });
});

describe('SlidingWindowCounter', () => {
  test('weights the previous window by its remaining overlap', () => {
    const clock = fakeClock(900);
    const lim = new SlidingWindowCounter({ limit: 10, windowMs: 1000, clock: clock.now });
    assert.equal(count(() => lim.allow('a'), 10), 10);
    clock.set(1150);
    assert.ok(Math.abs(lim.estimate('a') - 8.5) < 1e-9, `estimate at t=1150 should be 8.5, got ${lim.estimate('a')}`);
    assert.equal(count(() => lim.allow('a'), 5), 1, 'only one more fits at t=1150');
    clock.set(1500);
    assert.equal(count(() => lim.allow('a'), 10), 4, 'at t=1500, 10 × 0.5 + 1 = 6, so 4 more fit');
  });

  test('estimate does not count as a request', () => {
    const lim = new SlidingWindowCounter({ limit: 2, windowMs: 1000, clock: fakeClock(0).now });
    lim.estimate('a');
    lim.estimate('a');
    assert.equal(count(() => lim.allow('a'), 3), 2);
  });

  test('forgets traffic older than one full window', () => {
    const clock = fakeClock(900);
    const lim = new SlidingWindowCounter({ limit: 10, windowMs: 1000, clock: clock.now });
    count(() => lim.allow('a'), 10);
    clock.set(2100);
    assert.equal(lim.estimate('a'), 0);
    assert.equal(count(() => lim.allow('a'), 12), 10);
  });

  test('blocks the 2x boundary burst that the fixed window allows', () => {
    const clock = fakeClock(999);
    const lim = new SlidingWindowCounter({ limit: 10, windowMs: 1000, clock: clock.now });
    const first = count(() => lim.allow('a'), 10);
    clock.set(1001);
    const second = count(() => lim.allow('a'), 10);
    assert.ok(first + second <= 11, `sliding window let ${first + second} through`);
  });

  test('keys are independent', () => {
    const lim = new SlidingWindowCounter({ limit: 1, windowMs: 1000, clock: fakeClock(0).now });
    assert.equal(lim.allow('a'), true);
    assert.equal(lim.allow('b'), true);
    assert.equal(lim.allow('a'), false);
  });
});
