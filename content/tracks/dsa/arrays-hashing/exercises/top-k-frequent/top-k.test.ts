import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { topKFrequent } = await loadSolution<typeof import('./starter.ts')>();

test('returns the most frequent values, most frequent first', () => {
  assert.deepEqual(topKFrequent([1, 1, 1, 2, 2, 3], 2), [1, 2]);
  assert.deepEqual(topKFrequent([3, 3, 1, 2, 2, 2], 1), [2]);
});

test('breaks ties by smaller value', () => {
  assert.deepEqual(topKFrequent([5, 4, 5, 4, 6], 2), [4, 5]);
  assert.deepEqual(topKFrequent([9, 8, 7], 3), [7, 8, 9]);
});

test('handles negatives, k = 0 and k larger than the distinct count', () => {
  assert.deepEqual(topKFrequent([-1, -1, 2], 1), [-1]);
  assert.deepEqual(topKFrequent([1, 2, 3], 0), []);
  assert.deepEqual(topKFrequent([2, 1, 2], 5), [2, 1]);
  assert.deepEqual(topKFrequent([], 3), []);
});

test('rejects a negative k', () => {
  assert.throws(() => topKFrequent([1], -1), RangeError);
});

test('scales to 1,000,000 numbers', () => {
  const nums = Array.from({ length: 1_000_000 }, (_, i) => (i * 7919) % 50_000);
  for (let i = 0; i < 100; i++) nums.push(42);
  const start = performance.now();
  const top = topKFrequent(nums, 3);
  const ms = performance.now() - start;
  assert.equal(top[0], 42);
  assert.ok(ms < 2000, `took ${Math.round(ms)} ms`);
});
