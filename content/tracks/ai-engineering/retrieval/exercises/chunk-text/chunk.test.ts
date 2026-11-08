import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { chunkWords } = await loadSolution<typeof import('./starter.ts')>();

const TEN = 'w0 w1 w2 w3 w4 w5 w6 w7 w8 w9';

test('windows step by size - overlap and stop at the last word', () => {
  const chunks = chunkWords('doc', TEN, { size: 4, overlap: 1 });
  assert.deepEqual(
    chunks.map((c) => [c.start, c.end]),
    [
      [0, 4],
      [3, 7],
      [6, 10],
    ],
  );
  assert.equal(chunks[1]!.text, 'w3 w4 w5 w6');
});

test('ids and docId', () => {
  const chunks = chunkWords('report-7', TEN, { size: 5, overlap: 0 });
  assert.deepEqual(chunks.map((c) => c.id), ['report-7#0', 'report-7#1']);
  assert.ok(chunks.every((c) => c.docId === 'report-7'));
});

test('the last chunk may be shorter, but is never contained in the previous one', () => {
  const chunks = chunkWords('d', 'a b c d e', { size: 4, overlap: 2 });
  assert.deepEqual(
    chunks.map((c) => c.text),
    ['a b c d', 'c d e'],
  );
  const exact = chunkWords('d', 'a b c d', { size: 4, overlap: 2 });
  assert.equal(exact.length, 1, 'one window already covers every word');
});

test('normalizes any whitespace between words', () => {
  const chunks = chunkWords('d', '  first\tsecond\n\nthird   fourth ', { size: 3, overlap: 0 });
  assert.deepEqual(chunks.map((c) => c.text), ['first second third', 'fourth']);
});

test('empty text gives no chunks', () => {
  assert.deepEqual(chunkWords('d', '', { size: 3, overlap: 1 }), []);
  assert.deepEqual(chunkWords('d', '   \n ', { size: 3, overlap: 1 }), []);
});

test('rejects invalid sizes', () => {
  assert.throws(() => chunkWords('d', TEN, { size: 0, overlap: 0 }), RangeError);
  assert.throws(() => chunkWords('d', TEN, { size: 3, overlap: 3 }), RangeError);
  assert.throws(() => chunkWords('d', TEN, { size: 3, overlap: -1 }), RangeError);
});

test('every word appears in at least one chunk', () => {
  const words = Array.from({ length: 103 }, (_, i) => `t${i}`);
  const chunks = chunkWords('d', words.join(' '), { size: 10, overlap: 3 });
  const covered = new Set(chunks.flatMap((c) => c.text.split(' ')));
  assert.equal(covered.size, 103);
  assert.equal(chunks.at(-1)!.end, 103);
});
