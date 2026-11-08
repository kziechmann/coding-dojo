# Idempotency keys

Wrap a non-idempotent handler (think `POST /payments`) so clients can safely retry it with an `Idempotency-Key`.

```ts
const payments = new IdempotentHandler(chargeCard, { ttlMs: 24 * 60 * 60 * 1000, clock: () => Date.now() });
await payments.handle({ key: 'a1b2', body: { amount: 500, currency: 'cad' } }); // charges once
await payments.handle({ key: 'a1b2', body: { currency: 'cad', amount: 500 } }); // same response, no second charge
```

## Rules for `handle({ key, body })`

1. **New key:** run the handler and return its response. Store it if the status is below 500.
2. **Same key, same body:** return the stored response; don't run the handler.
3. **Same key, different body:** return `{ status: 422, body: { error: 'idempotency_key_reused' } }`.
4. **Same key while the first call is still running:** return `{ status: 409, body: { error: 'request_in_progress' } }`.
5. **Handler throws, or returns a 5xx:** store nothing and release the key, so a retry runs the handler again. A throw propagates to the caller.
6. **Expiry:** a stored response is forgotten once `ttlMs` has passed since it was stored (default 24 hours).

"Same body" means equal as JSON **ignoring object key order** (`{a:1,b:2}` equals `{b:2,a:1}`), at every depth. Array order still matters.

Different keys never affect each other.

**Predict:** why does rule 4 return 409 instead of waiting for the first call to finish and returning its result? (There are reasonable designs either way; be ready to argue yours.)
