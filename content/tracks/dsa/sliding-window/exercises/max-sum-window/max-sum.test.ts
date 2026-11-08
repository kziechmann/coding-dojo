import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { maxSumWindow } = await loadSolution<typeof import('./starter.ts')>();

test('finds the best window', () => {
  assert.equal(maxSumWindow([2, 1, 5, 1, 3, 2], 3), 9);
  assert.equal(maxSumWindow([1, 9, -1, 2], 2), 10);
});

test('handles all-negative input and k equal to the length', () => {
  assert.equal(maxSumWindow([-5, -2, -8], 1), -2);
  assert.equal(maxSumWindow([-5, -2, -8], 3), -15);
});

test('the best window can be the last one', () => {
  assert.equal(maxSumWindow([1, 1, 1, 10, 10], 2), 20);
});

test('rejects k out of range', () => {
  assert.throws(() => maxSumWindow([1, 2], 0), RangeError);
  assert.throws(() => maxSumWindow([1, 2], 3), RangeError);
});

test('runs in O(n): a million numbers, k = 1,000', () => {
  const nums = Array.from({ length: 1_000_000 }, (_, i) => ((i * 7919) % 2001) - 1000);
  const start = performance.now();
  const best = maxSumWindow(nums, 1000);
  const ms = performance.now() - start;
  assert.equal(typeof best, 'number');
  assert.ok(ms < 1000, `took ${Math.round(ms)} ms; is each window re-summed?`);
});
