import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { estimate, formatBytes, serversNeeded } = await loadSolution<typeof import('./starter.ts')>();

const close = (actual: number, expected: number, what: string) =>
  assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * 1e-9 + 1e-9, `${what}: expected ${expected}, got ${actual}`);

const photoApp = {
  dailyActiveUsers: 10_000_000,
  readsPerUserPerDay: 50,
  writesPerUserPerDay: 0.2,
  bytesPerWrite: 2_000_000,
  bytesPerRead: 200_000,
  retentionDays: 365 * 5,
  peakToAverage: 3,
  replicationFactor: 3,
};

describe('estimate', () => {
  test('photo app: read and write QPS', () => {
    const e = estimate(photoApp);
    close(e.avgReadQps, 500_000_000 / 86_400, 'avgReadQps');
    close(e.peakReadQps, (500_000_000 / 86_400) * 3, 'peakReadQps');
    close(e.avgWriteQps, 2_000_000 / 86_400, 'avgWriteQps');
    close(e.peakWriteQps, (2_000_000 / 86_400) * 3, 'peakWriteQps');
  });

  test('photo app: storage includes retention and replication', () => {
    close(estimate(photoApp).storageBytes, 2_000_000 * 2_000_000 * 1825 * 3, 'storageBytes');
  });

  test('photo app: peak egress and read/write ratio', () => {
    const e = estimate(photoApp);
    close(e.peakEgressBytesPerSec, (500_000_000 / 86_400) * 3 * 200_000, 'peakEgressBytesPerSec');
    close(e.readWriteRatio, 250, 'readWriteRatio');
  });

  test('no writes: ratio is Infinity and storage is 0', () => {
    const e = estimate({ ...photoApp, writesPerUserPerDay: 0 });
    assert.equal(e.readWriteRatio, Infinity);
    assert.equal(e.storageBytes, 0);
    assert.equal(e.avgWriteQps, 0);
  });

  test('rejects negative or non-finite inputs', () => {
    assert.throws(() => estimate({ ...photoApp, dailyActiveUsers: -1 }), RangeError);
    assert.throws(() => estimate({ ...photoApp, bytesPerRead: Number.NaN }), RangeError);
  });

  test('rejects a peak factor below 1', () => {
    assert.throws(() => estimate({ ...photoApp, peakToAverage: 0.5 }), RangeError);
  });
});

describe('formatBytes', () => {
  test('small values are whole bytes', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(999), '999 B');
  });

  test('decimal units with one decimal place', () => {
    assert.equal(formatBytes(1000), '1.0 KB');
    assert.equal(formatBytes(1_536_000), '1.5 MB');
    assert.equal(formatBytes(2.5e12), '2.5 TB');
    assert.equal(formatBytes(7.3e15), '7.3 PB');
  });

  test('rounding up to 1000 moves to the next unit', () => {
    assert.equal(formatBytes(999_960), '1.0 MB');
  });

  test('rejects negative input', () => {
    assert.throws(() => formatBytes(-1), RangeError);
  });
});

describe('serversNeeded', () => {
  test('rounds up to keep utilization under target', () => {
    assert.equal(serversNeeded(10_000, 1000, 0.5), 20);
    assert.equal(serversNeeded(10_001, 1000, 0.5), 21);
  });

  test('no traffic needs no servers', () => {
    assert.equal(serversNeeded(0, 1000, 0.5), 0);
  });

  test('rejects bad capacity or utilization', () => {
    assert.throws(() => serversNeeded(100, 0, 0.5), RangeError);
    assert.throws(() => serversNeeded(100, 1000, 0), RangeError);
    assert.throws(() => serversNeeded(100, 1000, 1.5), RangeError);
  });
});
