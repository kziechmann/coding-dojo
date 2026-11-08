# Hash ring with virtual nodes

Implement `HashRing` in `solution.ts`. The starter gives you `hash32(text)`, a well-mixed 32-bit hash. Use it for both keys and virtual nodes.

```ts
const ring = new HashRing({ virtualNodes: 100 });
ring.addNode('cache-a');
ring.addNode('cache-b');
ring.getNode('user:42');        // 'cache-a' or 'cache-b'
ring.getNodes('user:42', 2);    // two distinct servers, in ring order
```

## Rules

- Each physical node gets `virtualNodes` points (default 100), at `hash32(`${node}#${i}`)` for `i` from 0.
- `getNode(key)`: the owner of the first point clockwise from `hash32(key)`, meaning the first point whose hash is **≥** the key's hash, wrapping to the lowest point. Return `undefined` on an empty ring.
- `getNodes(key, count)`: walk clockwise from the same place and collect **distinct** physical nodes until you have `count` (or every node, if there are fewer).
- `addNode` of an existing node and `removeNode` of a missing one do nothing.
- `nodes()` lists the physical nodes, sorted.
- The mapping must not depend on the order nodes were added.
- Lookups must use binary search. A test does 100,000 lookups on a 10,000-point ring.

**Predict:** with 5 nodes, you add a sixth. What share of 50,000 keys should move, and where should every moved key go?
