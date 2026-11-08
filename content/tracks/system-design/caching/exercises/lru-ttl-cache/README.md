# LRU cache with TTLs

Implement `LruCache<V>` in `solution.ts`: a bounded cache that evicts the least recently used entry and expires entries after a time to live.

```ts
const cache = new LruCache<string>({ maxEntries: 1000, defaultTtlMs: 60_000, clock: () => Date.now() });
cache.set('user:1', 'Ada');          // uses defaultTtlMs
cache.set('flag', 'on', 5_000);      // per-entry TTL
cache.get('user:1');                 // 'Ada', and now most recently used
```

## Rules

- `get(key)` returns the value and marks it most recently used. An expired entry is removed and treated as a miss.
- `set(key, value, ttlMs?)` stores the value as most recently used. If the cache is full and the key is new, evict the least recently used entry first. Setting an existing key replaces it without evicting anything.
- TTL: an entry set at time `t` with TTL `x` is expired at any time `≥ t + x`. With no TTL and no `defaultTtlMs`, it never expires.
- `has(key)` says whether a live entry exists. It does **not** change recency or stats.
- `delete(key)` removes an entry and returns whether it existed.
- `size` (a getter) counts live, unexpired entries.
- `stats()` returns `{ hits, misses, evictions }`. Only `get` counts hits and misses; only capacity evictions count as evictions (expiry doesn't).
- Throw a `RangeError` if `maxEntries < 1`.
- `get` and `set` must be O(1). A test runs 200,000 operations on a 10,000-entry cache and fails if it's slow.

**Hint for later:** a JavaScript `Map` iterates in insertion order. What happens to that order if you delete a key and set it again?
