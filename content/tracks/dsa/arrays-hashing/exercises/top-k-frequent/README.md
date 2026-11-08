# Top k frequent elements

`topKFrequent(nums, k)` returns the `k` values that occur most often.

- Order: most frequent first; ties broken by the smaller value first.
- If there are fewer than `k` distinct values, return them all.
- Throw a `RangeError` if `k < 0`.

```ts
topKFrequent([1, 1, 1, 2, 2, 3], 2); // [1, 2]
topKFrequent([4, 4, 5, 5, 6], 2);    // [4, 5]  (tie at 2: smaller first)
```

**Before coding:** name three ways to pick the top k after counting, with their complexity. A test runs 1,000,000 numbers.
