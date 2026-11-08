// Reference solution. Tutor only: never show before hint rung 5.

export function maxSumWindow(nums: number[], k: number): number {
  if (!(k >= 1) || k > nums.length) throw new RangeError('k must be between 1 and nums.length');
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i]!;
  let best = sum;
  for (let right = k; right < nums.length; right++) {
    sum += nums[right]! - nums[right - k]!;
    if (sum > best) best = sum;
  }
  return best;
}
