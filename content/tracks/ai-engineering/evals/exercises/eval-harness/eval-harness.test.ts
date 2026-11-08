import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { wilsonInterval, exactMatch, runEval, compareRuns } = await loadSolution<typeof import('./starter.ts')>();

const near = (actual: number, expected: number, what = '') => assert.ok(Math.abs(actual - expected) < 1e-5, `${what} expected ${expected}, got ${actual}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('wilsonInterval', () => {
  test('matches known values', () => {
    const [lo, hi] = wilsonInterval(8, 10);
    near(lo, 0.490157, 'low');
    near(hi, 0.943319, 'high');
    const [lo2, hi2] = wilsonInterval(50, 100);
    near(lo2, 0.40383, 'low');
    near(hi2, 0.59617, 'high');
  });

  test('stays inside [0, 1] at the extremes', () => {
    const [lo, hi] = wilsonInterval(0, 10);
    near(lo, 0);
    near(hi, 0.27754);
    const [lo2, hi2] = wilsonInterval(10, 10);
    near(lo2, 0.72246);
    near(hi2, 1);
  });

  test('no data means total uncertainty', () => {
    assert.deepEqual(wilsonInterval(0, 0), [0, 1]);
  });
});

describe('exactMatch', () => {
  test('deep equality, ignoring key order', async () => {
    assert.equal((await exactMatch({ a: 1, b: [1, 2] }, { id: 'x', input: null, expected: { b: [1, 2], a: 1 } })).pass, true);
    assert.equal((await exactMatch({ a: 1 }, { id: 'x', input: null, expected: { a: '1' } })).pass, false);
    assert.equal((await exactMatch('Canada', { id: 'x', input: null, expected: 'Canada' })).score, 1);
  });
});

describe('runEval', () => {
  const cases = [
    { id: 'c1', input: 2, expected: 4, tags: ['easy'] },
    { id: 'c2', input: 3, expected: 9, tags: ['easy', 'odd'] },
    { id: 'c3', input: 5, expected: 25, tags: ['odd'] },
    { id: 'c4', input: -1, expected: 1 },
  ];
  const square = async (n: number) => {
    if (n < 0) throw new Error('negative input');
    return n === 5 ? 24 : n * n;
  };

  test('grades every case in order and survives a throwing system', async () => {
    const report = await runEval(cases, square, exactMatch);
    assert.deepEqual(report.results.map((r) => [r.id, r.pass]), [
      ['c1', true],
      ['c2', true],
      ['c3', false],
      ['c4', false],
    ]);
    assert.equal(report.results[3]!.error, 'negative input');
    assert.equal(report.results[3]!.score, 0);
    assert.deepEqual(report.results[3]!.tags, []);
    assert.equal(report.passRate, 0.5);
    near(report.ci95[0], wilsonInterval(2, 4)[0]);
  });

  test('reports pass rates by tag', async () => {
    const report = await runEval(cases, square, exactMatch);
    assert.deepEqual(report.byTag, { easy: { n: 2, passRate: 1 }, odd: { n: 2, passRate: 0.5 } });
  });

  test('score defaults from pass; custom scores and reasons are kept', async () => {
    const report = await runEval(
      cases.slice(0, 2),
      square,
      async (out) => (out === 4 ? { pass: true } : { pass: false, score: 0.4, reason: 'close' }),
    );
    assert.deepEqual(
      report.results.map((r) => [r.score, r.reason]),
      [
        [1, undefined],
        [0.4, 'close'],
      ],
    );
  });

  test('a throwing grader fails only that case', async () => {
    const report = await runEval(cases.slice(0, 2), square, (out) => {
      if (out === 9) throw new Error('grader bug');
      return { pass: true };
    });
    assert.equal(report.results[0]!.pass, true);
    assert.equal(report.results[1]!.error, 'grader bug');
  });

  test('never runs more cases at once than the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, input: i, expected: i }));
    const slow = async (n: number) => {
      active++;
      peak = Math.max(peak, active);
      await sleep(15);
      active--;
      return n;
    };
    const report = await runEval(many, slow, exactMatch, { concurrency: 3 });
    assert.equal(peak, 3, `peak concurrency was ${peak}`);
    assert.equal(report.passRate, 1);
  });

  test('an empty case list gives a zero pass rate', async () => {
    const report = await runEval([], square, exactMatch);
    assert.equal(report.passRate, 0);
    assert.deepEqual(report.ci95, [0, 1]);
  });
});

describe('compareRuns', () => {
  const report = (passes: Record<string, boolean>, ci95: [number, number]) => {
    const results = Object.entries(passes).map(([id, pass]) => ({ id, pass, score: pass ? 1 : 0, tags: [] }));
    return { results, passRate: results.filter((r) => r.pass).length / results.length, ci95, byTag: {} };
  };

  test('lists regressions and fixes case by case', () => {
    const base = report({ a: true, b: true, c: false, d: false }, [0.1, 0.9]);
    const cand = report({ a: true, b: false, c: true, d: true, e: true }, [0.3, 0.95]);
    const cmp = compareRuns(base, cand);
    assert.deepEqual(cmp.regressions, ['b']);
    assert.deepEqual(cmp.fixes.sort(), ['c', 'd']);
    near(cmp.delta, 0.8 - 0.5);
    assert.equal(cmp.significant, false);
  });

  test('a difference is significant only when the intervals do not overlap', () => {
    const base = report({ a: false }, wilsonInterval(50, 100));
    const cand = report({ a: true }, wilsonInterval(80, 100));
    assert.equal(compareRuns(base, cand).significant, true);
    const small = compareRuns(report({ a: false }, wilsonInterval(5, 10)), report({ a: true }, wilsonInterval(7, 10)));
    assert.equal(small.significant, false);
  });
});
