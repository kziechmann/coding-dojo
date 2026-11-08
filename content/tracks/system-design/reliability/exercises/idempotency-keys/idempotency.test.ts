import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakeClock, loadSolution } from '../../../../../_lib/harness.ts';

const { IdempotentHandler } = await loadSolution<typeof import('./starter.ts')>();

type Res = { status: number; body: unknown };

function charger(status = 201) {
  let charges = 0;
  const handler = async (body: unknown): Promise<Res> => {
    charges++;
    return { status, body: { id: `ch_${charges}`, echo: body } };
  };
  return { handler, charges: () => charges };
}

test('a new key runs the handler', async () => {
  const c = charger();
  const h = new IdempotentHandler(c.handler);
  const res = await h.handle({ key: 'k1', body: { amount: 500 } });
  assert.equal(res.status, 201);
  assert.equal(c.charges(), 1);
});

test('a repeat with the same body replays the stored response', async () => {
  const c = charger();
  const h = new IdempotentHandler(c.handler);
  const first = await h.handle({ key: 'k1', body: { amount: 500 } });
  const second = await h.handle({ key: 'k1', body: { amount: 500 } });
  assert.deepEqual(second, first);
  assert.equal(c.charges(), 1);
});

test('object key order does not matter, at any depth', async () => {
  const c = charger();
  const h = new IdempotentHandler(c.handler);
  await h.handle({ key: 'k1', body: { amount: 500, meta: { a: 1, b: [1, 2] } } });
  const again = await h.handle({ key: 'k1', body: { meta: { b: [1, 2], a: 1 }, amount: 500 } });
  assert.equal(again.status, 201);
  assert.equal(c.charges(), 1);
});

test('the same key with a different body is rejected with 422', async () => {
  const c = charger();
  const h = new IdempotentHandler(c.handler);
  await h.handle({ key: 'k1', body: { amount: 500 } });
  assert.deepEqual(await h.handle({ key: 'k1', body: { amount: 900 } }), { status: 422, body: { error: 'idempotency_key_reused' } });
  assert.deepEqual(await h.handle({ key: 'k1', body: { amount: 500, list: [2, 1] } }).then((r) => r.status), 422);
  assert.equal(c.charges(), 1);
});

test('array order still matters', async () => {
  const c = charger();
  const h = new IdempotentHandler(c.handler);
  await h.handle({ key: 'k1', body: { items: [1, 2] } });
  assert.equal((await h.handle({ key: 'k1', body: { items: [2, 1] } })).status, 422);
});

test('a concurrent repeat gets 409 while the first call is running', async () => {
  let release!: () => void;
  let charges = 0;
  const h = new IdempotentHandler(async () => {
    charges++;
    await new Promise<void>((r) => (release = r));
    return { status: 201, body: { id: 'ch_1' } };
  });
  const first = h.handle({ key: 'k1', body: { amount: 500 } });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(await h.handle({ key: 'k1', body: { amount: 500 } }), { status: 409, body: { error: 'request_in_progress' } });
  release();
  assert.equal((await first).status, 201);
  assert.equal((await h.handle({ key: 'k1', body: { amount: 500 } })).status, 201);
  assert.equal(charges, 1);
});

test('a throwing handler releases the key so a retry runs again', async () => {
  let calls = 0;
  const h = new IdempotentHandler(async () => {
    calls++;
    if (calls === 1) throw new Error('network blip');
    return { status: 201, body: { ok: true } };
  });
  await assert.rejects(h.handle({ key: 'k1', body: {} }), /network blip/);
  assert.equal((await h.handle({ key: 'k1', body: {} })).status, 201);
  assert.equal(calls, 2);
});

test('5xx responses are not stored; 4xx responses are', async () => {
  const server = charger(503);
  const h5 = new IdempotentHandler(server.handler);
  await h5.handle({ key: 'k', body: {} });
  await h5.handle({ key: 'k', body: {} });
  assert.equal(server.charges(), 2, 'a 503 must not be replayed');

  const client = charger(402);
  const h4 = new IdempotentHandler(client.handler);
  await h4.handle({ key: 'k', body: {} });
  await h4.handle({ key: 'k', body: {} });
  assert.equal(client.charges(), 1, 'a 402 is a real answer and should be replayed');
});

test('stored responses expire after the TTL', async () => {
  const clock = fakeClock(0);
  const c = charger();
  const h = new IdempotentHandler(c.handler, { ttlMs: 1000, clock: clock.now });
  await h.handle({ key: 'k1', body: {} });
  clock.advance(999);
  await h.handle({ key: 'k1', body: {} });
  assert.equal(c.charges(), 1);
  clock.advance(1);
  await h.handle({ key: 'k1', body: { different: true } });
  assert.equal(c.charges(), 2, 'after expiry the key is new again, even with a new body');
});

test('different keys are independent', async () => {
  const c = charger();
  const h = new IdempotentHandler(c.handler);
  await h.handle({ key: 'a', body: { n: 1 } });
  await h.handle({ key: 'b', body: { n: 2 } });
  assert.equal(c.charges(), 2);
});
