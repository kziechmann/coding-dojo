# Longest substring without repeating characters

`longestUniqueSubstring(s)` returns the longest substring of `s` with no repeated character. If several have the same length, return the one that starts first.

```ts
longestUniqueSubstring('abcabcbb'); // 'abc'
longestUniqueSubstring('pwwkew');   // 'wke'
longestUniqueSubstring('');         // ''
```

Characters are compared as JavaScript string units (`s[i]`), case-sensitive.

**Before coding:** say the window's invariant in one sentence. A test uses a 50,000-character string with a 20,000-character answer, so re-scanning each window is too slow.
