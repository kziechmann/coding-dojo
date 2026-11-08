# Capacity calculator

Turn a product workload into the numbers a design depends on.

**Before you code:** estimate the photo-sharing example from the brief by hand. Write down average read QPS, peak read QPS and total storage. The tests use the same numbers, so you can check your mental math.

## Implement in `solution.ts`

### `estimate(workload): Estimate`

| Field | Meaning |
| --- | --- |
| `avgReadQps`, `avgWriteQps` | Per-day totals divided by `SECONDS_PER_DAY` (86,400) |
| `peakReadQps`, `peakWriteQps` | Average × `peakToAverage` |
| `storageBytes` | Writes per day × `bytesPerWrite` × `retentionDays` × `replicationFactor` |
| `peakEgressBytesPerSec` | Peak read QPS × `bytesPerRead` |
| `readWriteRatio` | Reads per write; `Infinity` when there are no writes |

Throw a `RangeError` if any input is negative or not a finite number, or if `peakToAverage` is below 1.

### `formatBytes(bytes): string`

Decimal units (1 KB = 1,000 B): `B`, `KB`, `MB`, `GB`, `TB`, `PB`, `EB`.

- Under 1,000 bytes: whole number, e.g. `"999 B"`.
- Otherwise one decimal place, e.g. `"1.5 MB"`, `"7.3 PB"`.
- Never print `"1000.0 KB"`: if rounding reaches 1000, move up a unit (`"1.0 MB"`).
- Throw a `RangeError` for negative or non-finite input.

### `serversNeeded(peakQps, qpsPerServer, targetUtilization): number`

How many servers keep each one at or below `targetUtilization` (0 to 1] at peak. Round up. Zero traffic needs zero servers. Throw a `RangeError` if `qpsPerServer` is not positive or `targetUtilization` is outside (0, 1].

## Afterwards

Explain to the tutor what the photo example's numbers imply for the design.
