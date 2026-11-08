# Arrays and hashing

The most common interview move is also the simplest: **remember what you've seen in a hash map so you never search for it again.** A nested loop that asks "is there an earlier element that...?" is O(n²); a map that answers the same question in O(1) makes the whole pass O(n), at the cost of O(n) memory.

## Recognize it

Reach for a map or set when the problem says or implies:

- "find a pair / complement" (two sum),
- "have we seen this before" (duplicates, first repeated item),
- "group things that are equivalent" (anagrams, same digits, same shape),
- "how many times" (frequencies, majority element, top k).

## The key is the trick

Grouping problems come down to choosing a **canonical key**: a value that is equal for exactly the items that belong together.

| Items | Equivalent when | Key |
| --- | --- | --- |
| Words | Anagrams | Letters sorted (`"tea"` → `"aet"`), or a 26-count signature |
| Points | On the same line through the origin | Reduced slope fraction |
| Strings | Same pattern (`"abb"`, `"xyy"`) | Index of first occurrence per char (`0,1,1`) |

Sorting a word costs O(k log k); a count signature costs O(k). For short words either is fine. Say which you chose and why.

## Counting and top k

To find the k most frequent items:

1. Count with a map: O(n).
2. Then either sort the distinct items by count (O(u log u)), keep a size-k heap (O(u log k)), or **bucket sort**: an array where index i holds items seen i times, read from the top (O(n)).

**Predict:** in `[1,1,1,2,2,3]`, what are the top 2? And what's the time complexity of the bucket approach, and why can't a bucket index exceed n?

## Talking through it

In an interview, say the brute force first ("for each word, compare with every group: O(n² k)"), then the improvement ("a canonical key in a map: O(n k log k)"), then code. Name the memory cost. Interviewers grade the reasoning as much as the code.

## Pitfalls

- Using an object as a map with keys like `"__proto__"` or `"constructor"`. Use `Map` in JavaScript.
- Arrays as map keys: two arrays with the same contents are different keys. Join them into a string.
- Forgetting that ties need a rule when the output order matters.
