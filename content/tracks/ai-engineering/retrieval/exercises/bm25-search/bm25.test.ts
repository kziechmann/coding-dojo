import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { tokenize, Bm25Index, recallAtK } = await loadSolution<typeof import('./starter.ts')>();

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

describe('tokenize', () => {
  test('lowercases and splits on non-alphanumerics', () => {
    assert.deepEqual(tokenize("It's 2-1!  Canada WINS."), ['it', 's', '2', '1', 'canada', 'wins']);
    assert.deepEqual(tokenize('  '), []);
  });
});

describe('Bm25Index', () => {
  const build = (docs: Record<string, string>, options = {}) => {
    const index = new Bm25Index(options);
    for (const [id, text] of Object.entries(docs)) index.add(id, text);
    return index;
  };

  test('matches the BM25 formula on a tiny corpus', () => {
    const index = build({ d1: 'the cat sat', d2: 'the dog sat on the mat' });
    // N=2, n=1 → idf = ln(1 + 1.5/1.5) = ln 2; dl=3, avgdl=4.5
    const expected = (Math.log(2) * 1 * 2.2) / (1 + 1.2 * (1 - 0.75 + (0.75 * 3) / 4.5));
    const [top] = index.search('cat', 5);
    assert.equal(top?.id, 'd1');
    assert.ok(near(top!.score, expected), `expected ${expected}, got ${top?.score}`);
  });

  test('rare terms outweigh common ones', () => {
    const index = build({
      a: 'goal goal goal by the striker',
      b: 'offside call against the striker',
      c: 'a goal in the first half',
      d: 'another goal late on',
    });
    assert.equal(index.search('offside goal', 4)[0]?.id, 'b');
  });

  test('shorter documents win at equal term frequency', () => {
    const long = `apple ${Array.from({ length: 29 }, (_, i) => `filler${i}`).join(' ')}`;
    const index = build({ long, short: 'apple pie recipe' });
    assert.deepEqual(index.search('apple', 2).map((r) => r.id), ['short', 'long']);
  });

  test('term frequency saturates', () => {
    const index = build({ once: 'kick x y z', many: 'kick kick kick kick', other: 'x y z w' });
    const [first, second] = index.search('kick', 2);
    assert.equal(first?.id, 'many');
    assert.ok(first!.score < second!.score * 4, 'four mentions should score less than four times one mention');
  });

  test('repeated query terms count once', () => {
    const index = build({ d1: 'red card', d2: 'yellow card' });
    assert.ok(near(index.search('red red red', 1)[0]!.score, index.search('red', 1)[0]!.score));
  });

  test('returns at most k results, only positive scores, ties by id', () => {
    const index = build({ c: 'same words here', a: 'same words here', b: 'same words here', z: 'nothing related' });
    const results = index.search('same', 2);
    assert.deepEqual(results.map((r) => r.id), ['a', 'b']);
    assert.ok(index.search('same', 10).every((r) => r.score > 0 && r.id !== 'z'));
    assert.deepEqual(index.search('absent', 5), []);
  });

  test('size counts documents and duplicate ids are rejected', () => {
    const index = build({ a: 'x', b: 'y' });
    assert.equal(index.size, 2);
    assert.throws(() => index.add('a', 'again'));
  });

  test('custom k1 and b change the scores', () => {
    const docs = { d1: 'the cat sat', d2: 'the dog sat on the mat' };
    const noNorm = build(docs, { b: 0 }).search('cat', 1)[0]!.score;
    const expected = (Math.log(2) * 2.2) / (1 + 1.2);
    assert.ok(near(noNorm, expected), `with b=0 expected ${expected}, got ${noNorm}`);
  });
});

describe('recallAtK', () => {
  test('averages per-query recall', () => {
    const results = [
      ['a', 'b', 'c'],
      ['x', 'y'],
    ];
    const relevant = [['a', 'z'], ['y']];
    assert.equal(recallAtK(results, relevant, 2), 0.75);
    assert.equal(recallAtK(results, relevant, 1), 0.25);
  });

  test('skips queries with nothing relevant', () => {
    assert.equal(recallAtK([['a'], ['b']], [['a'], []], 1), 1);
    assert.equal(recallAtK([['a']], [[]], 1), 0);
  });

  test('rejects mismatched lengths', () => {
    assert.throws(() => recallAtK([['a']], [], 1), RangeError);
  });
});
