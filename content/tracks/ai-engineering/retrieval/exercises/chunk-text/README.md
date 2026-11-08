# Chunk text with overlap

Implement `chunkWords(docId, text, { size, overlap })` in `solution.ts`. It splits text into windows of words, each sharing `overlap` words with the one before.

## Rules

- Words are runs of non-whitespace; any whitespace (spaces, tabs, newlines) separates them. Chunk text joins its words with single spaces.
- Windows start at word 0 and step forward by `size − overlap` words. Each window has up to `size` words.
- Stop after the window that reaches the last word: never emit a chunk that is entirely contained in the previous one.
- Each chunk is `{ id, docId, text, start, end }`, where `start` and `end` are word indexes (end exclusive) and `id` is `${docId}#${n}` counting from 0.
- Empty or whitespace-only text gives `[]`.
- Throw a `RangeError` if `size < 1`, `overlap < 0`, or `overlap >= size`.

**Predict:** 10 words, size 4, overlap 1. How many chunks, and what are their start and end indexes?
