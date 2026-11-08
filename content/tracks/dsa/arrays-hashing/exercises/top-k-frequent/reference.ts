// Reference solution. Tutor only: never show before hint rung 5.

export function topKFrequent(nums: number[], k: number): number[] {
  if (k < 0) throw new RangeError('k must be non-negative');
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);
  // Bucket sort by count: index = how many times a value appeared.
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [value, count] of counts) buckets[count]!.push(value);
  const out: number[] = [];
  for (let c = buckets.length - 1; c > 0 && out.length < k; c--) {
    const bucket = buckets[c]!;
    if (bucket.length === 0) continue;
    bucket.sort((a, b) => a - b);
    for (const v of bucket) {
      if (out.length === k) break;
      out.push(v);
    }
  }
  return out;
}
