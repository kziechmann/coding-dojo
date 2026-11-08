import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { groupAnagrams } = await loadSolution<typeof import('./starter.ts')>();

test('groups anagrams in order of first appearance', () => {
  assert.deepEqual(groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']), [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]);
});

test('handles empty input and empty strings', () => {
  assert.deepEqual(groupAnagrams([]), []);
  assert.deepEqual(groupAnagrams(['', '']), [['', '']]);
});

test('keeps duplicates and is case-sensitive', () => {
  assert.deepEqual(groupAnagrams(['ab', 'ba', 'ab', 'Ab']), [['ab', 'ba', 'ab'], ['Ab']]);
});

test('letter counts matter, not just the set of letters', () => {
  assert.deepEqual(groupAnagrams(['aab', 'abb', 'bab', 'aba']), [['aab', 'aba'], ['abb', 'bab']]);
});

test('runs in about O(n k log k): 50,000 words', () => {
  const words = Array.from({ length: 50_000 }, (_, i) => {
    const s = (i * 2654435761 >>> 0).toString(36).padStart(7, 'a').slice(0, 7);
    return i % 2 ? [...s].reverse().join('') : s;
  });
  const start = performance.now();
  const groups = groupAnagrams(words);
  const ms = performance.now() - start;
  assert.equal(groups.flat().length, words.length);
  assert.ok(ms < 1500, `took ${Math.round(ms)} ms; are you comparing every pair?`);
});
