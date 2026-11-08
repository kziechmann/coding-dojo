# Sliding window

Many problems ask about the best **contiguous** run: the longest substring with some property, the subarray of size k with the largest sum, the smallest window containing all of a set. The brute force checks every start and end: O(n²) or worse. A sliding window walks two pointers, `left` and `right`, forward only, so each element enters and leaves the window once: O(n).

## Two shapes

**Fixed size k.** Add the element entering on the right and remove the one leaving on the left. The sum (or count) updates in O(1) instead of being recomputed.

```
sum += nums[right]; if (right >= k) sum -= nums[right - k]
```

**Variable size.** Grow `right` every step; shrink `left` only while the window breaks the rule. The skeleton:

```
for right in 0..n-1:
    add s[right] to the window state
    while the window is invalid:
        remove s[left]; left++
    record the answer for window [left, right]
```

## The invariant

Before coding, say the invariant out loud: *"the window [left, right] never contains a repeated character."* It tells you exactly when to shrink and why the answer you record is valid. Interviewers listen for it.

## Window state

Pick the smallest state that answers "is the window valid?" in O(1):

- a running sum for sums,
- a count map for "at most k distinct" or "contains all of these",
- a last-seen index map, which lets `left` jump straight past a repeat instead of stepping.

## Why it's O(n)

`right` moves n times. `left` only moves forward and can't pass `right`, so it moves at most n times in total, even though the inner `while` looks nested. Total work: O(n). Being able to explain this is half the credit.

**Predict:** for `"abcabcbb"`, trace `left` and `right` as you find the longest substring without repeats. What is the answer, and at which `right` is it first reached? (3, `"abc"`, first reached at right = 2.)

## When it doesn't apply

Sliding windows need the validity to be **monotonic**: shrinking a valid window keeps it valid, and growing an invalid one keeps it invalid. With negative numbers in "subarray sum equals k", that breaks; use prefix sums with a hash map instead.
