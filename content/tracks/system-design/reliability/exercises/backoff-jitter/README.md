# Backoff with jitter and a retry helper

Implement `backoffDelay` and `retry` in `solution.ts`.

## `backoffDelay(attempt, { baseMs, maxMs, jitter }, random = Math.random)`

`attempt` is the attempt that just failed, starting at 1. Let `exp = min(maxMs, baseMs × 2^(attempt − 1))`.

| `jitter` | Delay |
| --- | --- |
| `'none'` | `exp` |
| `'full'` | `floor(random() × exp)` |
| `'equal'` | `floor(exp / 2 + random() × exp / 2)` |

Throw a `RangeError` if `attempt < 1`.

## `retry(fn, options)`

Calls `fn(attempt)` until it resolves, and returns its value.

- On failure: if attempts remain and `isRetryable(error)` is true (the default treats every error as retryable), `await sleep(backoffDelay(attempt, ...))` and try again.
- Otherwise throw the error from the last attempt. Don't sleep after the final failure.
- `maxAttempts` counts every call, including the first. Throw a `RangeError` if it's below 1.
- `sleep` defaults to a real `setTimeout` wait and `random` to `Math.random`; tests pass fakes.

**Afterwards:** tell the tutor why "retry every error 5 times with no jitter" in 10,000 clients can turn a 30-second database failover into a 10-minute outage.
