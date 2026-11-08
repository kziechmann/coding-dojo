# Single flight and a cache-aside loader

When a hot key expires, every request that arrives during the reload misses and hits the database. Coalescing those concurrent loads into one is called **single flight** (after Go's `singleflight` package). Build it, then use it in a cache-aside loader.

## `SingleFlight<T>`

```ts
const sf = new SingleFlight<User>();
const [a, b] = await Promise.all([sf.do('user:1', loadUser), sf.do('user:1', loadUser)]); // loadUser runs once
```

- `do(key, fn)`: if a call for `key` is already in flight, return the same promise. Otherwise call `fn()` and remember its promise until it settles.
- Once it settles (resolved **or** rejected), forget the key, so the next call runs `fn` again.
- A rejection reaches every caller that was waiting.
- If `fn` throws synchronously, `do` returns a rejected promise (it must not throw) and doesn't leave the key stuck.
- `inFlight()` returns how many keys are loading right now.

## `cachedLoader({ load, ttlMs, clock })`

Cache-aside with stampede protection:

- `get(key)` returns a cached value if it's younger than `ttlMs`.
- Otherwise it loads through single flight, caches the result with the load's completion time, and returns it.
- Errors are **not** cached: every waiter gets the rejection, and the next `get` tries again.
- `loadCount()` returns how many times `load` has been called.

**Predict:** 50 concurrent `get('k')` calls on a cold cache. How many loads? Then 50 more after the TTL passes?
