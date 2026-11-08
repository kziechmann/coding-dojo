import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { HashRing } = await loadSolution<typeof import('./starter.ts')>();

const NODES = ['node-a', 'node-b', 'node-c', 'node-d', 'node-e'];
const KEYS = Array.from({ length: 50_000 }, (_, i) => `key-${i}`);

function ringOf(nodes: string[], virtualNodes = 100) {
  const ring = new HashRing({ virtualNodes });
  for (const n of nodes) ring.addNode(n);
  return ring;
}

test('an empty ring owns nothing; a single node owns everything', () => {
  const ring = new HashRing();
  assert.equal(ring.getNode('k'), undefined);
  assert.deepEqual(ring.getNodes('k', 2), []);
  ring.addNode('only');
  assert.equal(ring.getNode('k'), 'only');
  assert.equal(ring.getNode('another'), 'only');
});

test('mapping is deterministic and independent of insertion order', () => {
  const a = ringOf(NODES);
  const b = ringOf([...NODES].reverse());
  for (const k of KEYS.slice(0, 2000)) assert.equal(a.getNode(k), b.getNode(k), k);
});

test('virtual nodes spread keys within 30% of an even share', () => {
  const ring = ringOf(NODES);
  const counts = new Map<string, number>();
  for (const k of KEYS) {
    const n = ring.getNode(k)!;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  const even = KEYS.length / NODES.length;
  for (const [node, c] of counts) assert.ok(Math.abs(c - even) / even < 0.3, `${node} got ${c} keys, even share is ${even}`);
});

test('adding a node moves only about 1/N of keys, all to the new node', () => {
  const ring = ringOf(NODES);
  const before = KEYS.map((k) => ring.getNode(k));
  ring.addNode('node-f');
  let moved = 0;
  KEYS.forEach((k, i) => {
    const now = ring.getNode(k);
    if (now !== before[i]) {
      moved++;
      assert.equal(now, 'node-f', `${k} moved from ${before[i]} to ${now}, not to the new node`);
    }
  });
  const share = moved / KEYS.length;
  assert.ok(share > 0.08 && share < 0.25, `${(share * 100).toFixed(1)}% of keys moved; expect about 17%`);
});

test('removing a node moves only its keys', () => {
  const ring = ringOf(NODES);
  const before = KEYS.slice(0, 5000).map((k) => ring.getNode(k));
  ring.removeNode('node-c');
  KEYS.slice(0, 5000).forEach((k, i) => {
    if (before[i] !== 'node-c') assert.equal(ring.getNode(k), before[i], `${k} should not have moved`);
    else assert.notEqual(ring.getNode(k), 'node-c');
  });
  assert.deepEqual(ring.nodes(), ['node-a', 'node-b', 'node-d', 'node-e']);
});

test('getNodes returns distinct physical nodes, starting with the owner', () => {
  const ring = ringOf(NODES);
  for (const k of KEYS.slice(0, 500)) {
    const replicas = ring.getNodes(k, 3);
    assert.equal(replicas.length, 3);
    assert.equal(new Set(replicas).size, 3, `duplicates for ${k}: ${replicas.join(', ')}`);
    assert.equal(replicas[0], ring.getNode(k));
  }
  assert.equal(ring.getNodes('k', 10).length, 5, 'cannot return more nodes than exist');
});

test('adding twice and removing a missing node are no-ops', () => {
  const ring = ringOf(['x', 'y']);
  const before = KEYS.slice(0, 200).map((k) => ring.getNode(k));
  ring.addNode('x');
  ring.removeNode('nope');
  assert.deepEqual(KEYS.slice(0, 200).map((k) => ring.getNode(k)), before);
  assert.deepEqual(ring.nodes(), ['x', 'y']);
});

test('lookups use binary search: 100,000 lookups on 10,000 points', () => {
  const ring = ringOf(Array.from({ length: 100 }, (_, i) => `n${i}`));
  const start = performance.now();
  for (let i = 0; i < 100_000; i++) ring.getNode(`k${i}`);
  const ms = performance.now() - start;
  assert.ok(ms < 1500, `took ${Math.round(ms)} ms; is getNode scanning every point?`);
});
