// Capacity calculator. See README.md for the rules; run `./dojo test capacity-calculator`.

export interface Workload {
  dailyActiveUsers: number;
  readsPerUserPerDay: number;
  writesPerUserPerDay: number;
  /** Bytes stored per write. */
  bytesPerWrite: number;
  /** Bytes sent back per read. */
  bytesPerRead: number;
  /** How long writes are kept. */
  retentionDays: number;
  /** Peak traffic divided by average traffic, e.g. 3. */
  peakToAverage: number;
  /** Copies of each stored byte, e.g. 3. */
  replicationFactor: number;
}

export interface Estimate {
  avgReadQps: number;
  peakReadQps: number;
  avgWriteQps: number;
  peakWriteQps: number;
  storageBytes: number;
  peakEgressBytesPerSec: number;
  readWriteRatio: number;
}

export const SECONDS_PER_DAY = 86_400;

export function estimate(workload: Workload): Estimate {
  throw new Error('TODO: implement estimate()');
}

export function formatBytes(bytes: number): string {
  throw new Error('TODO: implement formatBytes()');
}

export function serversNeeded(peakQps: number, qpsPerServer: number, targetUtilization: number): number {
  throw new Error('TODO: implement serversNeeded()');
}
