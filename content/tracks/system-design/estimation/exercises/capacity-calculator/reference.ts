// Reference solution. Tutor only: never show before hint rung 5.

export interface Workload {
  dailyActiveUsers: number;
  readsPerUserPerDay: number;
  writesPerUserPerDay: number;
  bytesPerWrite: number;
  bytesPerRead: number;
  retentionDays: number;
  peakToAverage: number;
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
  for (const [key, value] of Object.entries(workload)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new RangeError(`${key} must be a non-negative number`);
    }
  }
  if (workload.peakToAverage < 1) throw new RangeError('peakToAverage must be at least 1');

  const readsPerDay = workload.dailyActiveUsers * workload.readsPerUserPerDay;
  const writesPerDay = workload.dailyActiveUsers * workload.writesPerUserPerDay;
  const avgReadQps = readsPerDay / SECONDS_PER_DAY;
  const avgWriteQps = writesPerDay / SECONDS_PER_DAY;
  const peakReadQps = avgReadQps * workload.peakToAverage;

  return {
    avgReadQps,
    peakReadQps,
    avgWriteQps,
    peakWriteQps: avgWriteQps * workload.peakToAverage,
    storageBytes: writesPerDay * workload.bytesPerWrite * workload.retentionDays * workload.replicationFactor,
    peakEgressBytesPerSec: peakReadQps * workload.bytesPerRead,
    readWriteRatio: writesPerDay === 0 ? Infinity : readsPerDay / writesPerDay,
  };
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new RangeError('bytes must be a non-negative number');
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  if (Number(value.toFixed(1)) >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value.toFixed(1)} ${UNITS[unit]}`;
}

export function serversNeeded(peakQps: number, qpsPerServer: number, targetUtilization: number): number {
  if (!(qpsPerServer > 0)) throw new RangeError('qpsPerServer must be positive');
  if (!(targetUtilization > 0 && targetUtilization <= 1)) throw new RangeError('targetUtilization must be in (0, 1]');
  if (peakQps <= 0) return 0;
  return Math.ceil(peakQps / (qpsPerServer * targetUtilization));
}
