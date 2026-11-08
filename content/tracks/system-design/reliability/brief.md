# Retries, backoff and idempotency

Networks drop packets, services restart and databases fail over. A client that never retries turns every blip into an error; a client that retries carelessly turns a blip into an outage or charges a customer twice. Both halves need design.

## When to retry

Retry when the failure is **transient** and the operation is **safe to repeat**:

- Timeouts, connection resets, 429 Too Many Requests, 502/503/504: usually worth retrying.
- 400, 401, 403, 404, 422: the request itself is wrong, and retrying won't help.
- A timeout on a non-idempotent call (like "charge the card") is the dangerous case: you don't know whether it happened.

## Backoff and jitter

Retrying immediately hammers a service that is already struggling. Exponential backoff waits `base × 2^(attempt − 1)` between tries, capped at a maximum.

Backoff alone still synchronizes clients: if 10,000 clients fail at the same moment, they all retry at 100 ms, then all at 200 ms, in waves. **Jitter** spreads them out:

- **Full jitter:** wait a random time between 0 and the backoff. Best at breaking up waves.
- **Equal jitter:** wait half the backoff plus a random amount up to the other half. Guarantees some minimum wait.

Also cap the total: a maximum number of attempts, and ideally a retry budget (for example "retries may add at most 10% extra load") so a fleet of clients can't multiply an outage.

**Predict:** base 100 ms, cap 2 s, no jitter. What are the waits before attempts 2, 3, 4 and 7? (100, 200, 400 and 2,000 ms, since 3,200 is capped.)

## Idempotency

An operation is idempotent if doing it twice has the same effect as doing it once. `PUT /users/1 {name}` is naturally idempotent; `POST /payments` is not. The standard fix is an **idempotency key**: the client generates a unique key per logical operation and sends it on every retry.

The server stores `key → (request fingerprint, response)`:

1. New key: run the operation, store the response, return it.
2. Same key, same request: return the stored response without running anything.
3. Same key, **different** request: reject (422). The client has a bug.
4. Same key while the first is still running: reject with 409 so the client retries later, rather than running it twice.
5. Server errors (5xx) and crashes are not stored, so a retry gets a real second chance.

The fingerprint must ignore meaningless differences like JSON key order, or a retry from a different client library will look like a conflict.

## At-least-once everywhere

Queues (SQS, Kafka consumers), webhooks and workflow engines deliver **at least once**: after a crash, a message can be redelivered. Exactly-once delivery is rare and costly. The practical answer is **idempotent consumers**: dedupe by a message id, or make the effect naturally repeatable (upserts, "set status to shipped" instead of "increment shipped count").

## In a design interview

Whenever money, inventory or notifications cross a network, say: "Clients retry with exponential backoff and jitter; writes carry an idempotency key; consumers dedupe by message id." That one sentence covers most follow-ups.
