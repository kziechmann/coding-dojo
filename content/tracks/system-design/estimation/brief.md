# Back-of-envelope estimation

Numbers decide architecture. "Do we need a cache?" has no answer until you know the read rate; "can one database hold this?" has none until you know the storage growth. Estimation is how you get those numbers in two minutes, out loud, with round figures.

## The conversions that do most of the work

- **A day is 86,400 seconds.** Round to 10⁵ in your head. So 1 million requests a day is about 12 per second on average, and 100 million is about 1,200.
- **Peak is not average.** Traffic bunches up by time of day and by events. State an assumption (2× to 10× is common) and use it.
- **Reads and writes separately.** Read-heavy systems point to caches, CDNs and read replicas. Write-heavy systems point to partitioning, queues and batching.
- **Storage** = writes per day × bytes per write × days kept × copies.
- **Egress bandwidth** = peak reads per second × bytes per response.
- **Decimal units for estimates:** KB 10³, MB 10⁶, GB 10⁹, TB 10¹², PB 10¹⁵.

## Latency, by order of magnitude

| Operation | Roughly |
| --- | --- |
| Read from main memory | 100 ns |
| Random read from an SSD | 100 µs |
| Round trip inside one datacenter | 0.5 ms |
| Read 1 MB sequentially from SSD | 1 ms |
| Round trip across a continent | 50–150 ms |

Exact figures vary by hardware; the gaps between rows (often 1,000×) are what matter. A network hop costs thousands of memory reads, which is why caches sit close to the code that needs them.

## Worked example: a photo-sharing app

Assume 10 million daily active users, each viewing 50 feed pages and uploading 0.2 photos a day. Photos are 2 MB, kept for 5 years, stored 3 times. Peak is 3× average.

**Predict before reading on:** is this read-heavy or write-heavy, and by roughly how much?

1. Reads: 10M × 50 = 500M a day ÷ 86,400 ≈ 5,800/s average, about 17,000/s at peak.
2. Writes: 10M × 0.2 = 2M a day ≈ 23/s average.
3. Ratio: 250 reads per write. Strongly read-heavy.
4. Storage: 2M × 2 MB = 4 TB a day; × 1,825 days ≈ 7.3 PB; × 3 copies ≈ 22 PB.

**What it implies:** serve photos from object storage behind a CDN, cache feed pages, and accept that storage cost, not compute, is the main bill. One database could take 23 writes a second; 22 PB of photos could never live in one.

## How to do it in an interview

1. State assumptions and round hard (86,400 → 100,000 is fine; say so).
2. Do reads, writes, storage and bandwidth, in that order.
3. Sanity-check against something you know ("17k/s is a busy but ordinary API").
4. End each number with what it means for the design.

## Common mistakes

- Mixing bits and bytes: 1 Gbps is 125 MB/s.
- Forgetting replication and retention in storage.
- Quoting a number without saying what it changes.
