# Group anagrams

`groupAnagrams(words)` returns the words grouped so that each group holds words that are anagrams of each other.

- Groups appear in the order their first word appears in the input.
- Words inside a group keep their input order (duplicates included).
- Comparison is case-sensitive and uses every character as given.

```ts
groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']);
// [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]
```

Say the brute force and its complexity before coding. A test with 50,000 words fails anything slower than about O(n · k log k).
