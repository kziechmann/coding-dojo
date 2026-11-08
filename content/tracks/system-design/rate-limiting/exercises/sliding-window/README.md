# Fixed window and sliding window counter

Implement two per-key limiters in `solution.ts`. Both take `{ limit, windowMs, clock }`; `clock` returns milliseconds.

## `FixedWindowLimiter`

- Windows are aligned to the clock: a request at time `t` belongs to the window starting at `floor(t / windowMs) * windowMs`.
- `allow(key)` returns `true` and counts the request if the key has made fewer than `limit` requests in the current window.
- Keys are independent.

## `SlidingWindowCounter`

Keep two counts per key: the previous aligned window and the current one.

```
estimate = previous × (windowMs − elapsedInCurrent) / windowMs + current
```

- `allow(key)` returns `true` and increments `current` if `estimate + 1 ≤ limit`.
- `estimate(key)` returns the estimate without counting anything.
- When time moves into the next window, the current count becomes the previous one. If **more than one** whole window has passed, the previous count is 0.

**Predict before running the tests:** limit 10 per 1,000 ms. 10 requests at t = 900 all pass. At t = 1,150, how many more pass? At t = 1,500?

## Afterwards

Tell the tutor which limiter you'd put in front of an LLM API that bills per request, and why.
