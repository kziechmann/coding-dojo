# Maximum sum of k consecutive numbers

`maxSumWindow(nums, k)` returns the largest sum of any `k` consecutive numbers.

- Numbers may be negative.
- Throw a `RangeError` if `k < 1` or `k > nums.length`.

```ts
maxSumWindow([2, 1, 5, 1, 3, 2], 3); // 9  (5 + 1 + 3)
```

A test uses a million numbers with k = 1,000, so re-summing each window (O(n · k)) is too slow.
