# Token bucket

Implement `TokenBucket` in `solution.ts`.

**Before you code:** answer the "bucket-burst" question from the brief out loud: capacity 10, refill 5/s, full at t=0, 14 requests at t=0.

```ts
const bucket = new TokenBucket({ capacity: 10, refillPerSecond: 5, clock: () => Date.now() });
bucket.tryRemove();    // true while tokens remain
bucket.available();    // tokens right now (may be fractional)
bucket.retryAfterMs(); // how long until a request could pass
```

## Rules

- The bucket starts **full**.
- Refill lazily from the clock: `elapsed seconds × refillPerSecond`, capped at `capacity`. No timers.
- `tryRemove(n = 1)` spends `n` tokens and returns `true` only if all `n` are available. If not, it spends nothing and returns `false`.
- `available()` returns the current token count after refilling. Fractions are fine (1.5 tokens means one request can pass).
- `retryAfterMs(n = 1)` returns `0` if `n` tokens are available now, otherwise the milliseconds until they will be. Return `Infinity` if `n` is larger than `capacity`, or if the bucket never refills.
- If the clock goes **backwards**, add no tokens, and refill from the new, earlier time from then on.
- Throw a `RangeError` if `capacity` is not positive or `refillPerSecond` is negative.

The constructor's `clock` returns milliseconds and defaults to `Date.now`. Tests pass a fake clock.

## Stretch

How would you share one bucket across 20 servers? Sketch it for the tutor before looking at the brief's answer.
