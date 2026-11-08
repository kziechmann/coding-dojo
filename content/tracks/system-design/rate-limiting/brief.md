# Rate limiting

A rate limiter decides, for each request, "allow or reject?" based on how many requests the same caller made recently. It protects capacity, keeps one noisy client from hurting the rest, caps spend on paid downstream APIs (LLM calls included), and slows down abuse such as credential stuffing.

## Where it lives and what it keys on

- **Where:** at the edge or API gateway for coarse limits; inside a service for limits that need business context ("5 password resets per account per hour"). Clients should also back off on their own.
- **Key:** API key or user id is fairest. IP address is a fallback for anonymous traffic, but many users can share one IP.
- **Response:** HTTP 429 with a `Retry-After` header, so well-behaved clients wait instead of hammering.

## The algorithms

| Algorithm | How it works | Good at | Weak at |
| --- | --- | --- | --- |
| Token bucket | Tokens refill at a steady rate up to a capacity; each request spends one | Allows short bursts, enforces the average | Two numbers to tune |
| Leaky bucket | Requests queue and drain at a fixed rate | Smooth output to a fragile backend | Adds latency; bursts wait |
| Fixed window | Count requests per clock window (e.g. per minute) | Tiny state, easy to reason about | Up to 2× the limit across a window boundary |
| Sliding log | Keep a timestamp per request, count those in the last window | Exact | Memory grows with traffic |
| Sliding window counter | Weight the previous window's count by how much of it still overlaps | Close to exact, two counters per key | An approximation |

**Predict:** a fixed window allows 100 requests per minute. A client sends 100 at 12:00:59 and 100 at 12:01:00. How many pass? (All 200: each lands in a different window. That boundary burst is why sliding windows exist.)

## Token bucket in one paragraph

Store `tokens` and `lastRefill`. On each request, add `elapsed × rate` tokens (capped at capacity), then spend one if you have one. You never need a background timer: the refill is computed lazily from the clock. Capacity sets the largest burst; the rate sets the long-run average.

## Sliding window counter in one formula

With windows of length W, the current window started at `start`, and counts `prev` and `curr`:

estimate = prev × (W − (now − start)) / W + curr

Allow if estimate + 1 ≤ limit. Ten percent into the window, 90% of the previous window's traffic still counts.

## Across many servers

Each server keeping its own counters lets a client get N × limit by spreading requests. Common fixes:

1. **Central store** such as Redis, using an atomic increment or a small script so check-and-update is one step. Adds a network hop per request.
2. **Local limits plus periodic sync**, accepting brief overshoot in exchange for no hop.
3. **Sticky routing** by key, so one server owns each caller.

Say which one you choose and what overshoot you accept. A limiter that fails closed when Redis is down can take the whole API down with it; most teams fail open and alert.

## Mistakes to avoid

- Floating-point drift at exact boundaries: compare with care or use integer math.
- Letting a clock that moves backwards mint free tokens.
- Forgetting to tell the client when to retry.
