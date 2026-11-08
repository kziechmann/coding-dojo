import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { longestUniqueSubstring } = await loadSolution<typeof import('./starter.ts')>();

test('classic examples', () => {
  assert.equal(longestUniqueSubstring('abcabcbb'), 'abc');
  assert.equal(longestUniqueSubstring('bbbbb'), 'b');
  assert.equal(longestUniqueSubstring('pwwkew'), 'wke');
});

test('empty and single-character strings', () => {
  assert.equal(longestUniqueSubstring(''), '');
  assert.equal(longestUniqueSubstring('z'), 'z');
});

test('the left edge never moves backwards ("abba")', () => {
  assert.equal(longestUniqueSubstring('abba'), 'ab');
  assert.equal(longestUniqueSubstring('tmmzuxt'), 'mzuxt');
});

test('ties return the earliest substring; case matters', () => {
  assert.equal(longestUniqueSubstring('abcxabc'), 'abcx');
  assert.equal(longestUniqueSubstring('aAbB'), 'aAbB');
});

test('spaces and punctuation are characters too', () => {
  assert.equal(longestUniqueSubstring('a b c!a'), 'b c!a');
});

test('runs in O(n): 50,000 characters, 20,000-character answer', () => {
  const s = Array.from({ length: 50_000 }, (_, i) => String.fromCharCode(0x4e00 + (i % 20_000))).join('');
  const start = performance.now();
  const out = longestUniqueSubstring(s);
  const ms = performance.now() - start;
  assert.equal(out.length, 20_000);
  assert.ok(ms < 1500, `took ${Math.round(ms)} ms; is each window re-scanned?`);
});
