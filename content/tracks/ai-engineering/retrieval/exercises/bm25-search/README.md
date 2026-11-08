# BM25 search and recall@k

Implement `tokenize`, `Bm25Index` and `recallAtK` in `solution.ts`.

## `tokenize(text): string[]`

Lowercase, split on anything that isn't a letter or digit, drop empty strings. `"It's 2-1!"` → `['it', 's', '2', '1']`.

## `Bm25Index`

```ts
const index = new Bm25Index({ k1: 1.2, b: 0.75 }); // these are the defaults
index.add('d1', 'the cat sat');
index.search('cat', 5); // [{ id: 'd1', score: 0.80... }]
```

- `add(id, text)` indexes a document. Adding an id twice throws an `Error`.
- `search(query, k)` returns up to `k` results `{ id, score }`, highest score first, **only** documents with a score above 0. Ties break by id, alphabetically.
- `size` (a getter) is the number of documents.

For each query term `t` (repeated query terms count once):

```
idf(t)  = ln(1 + (N − n_t + 0.5) / (n_t + 0.5))
score  += idf(t) × tf × (k1 + 1) / (tf + k1 × (1 − b + b × dl / avgdl))
```

`N` is the number of documents, `n_t` how many contain `t`, `tf` how often `t` appears in the document, `dl` the document's length in tokens, `avgdl` the average length.

## `recallAtK(results, relevant, k)`

`results[i]` is the ranked id list for query `i` and `relevant[i]` its relevant ids. For each query, recall is (relevant ids in the top `k`) ÷ (number of relevant ids). Return the mean over queries. Skip queries with no relevant ids; if every query is skipped, return 0. Throw a `RangeError` if the two lists differ in length.

**Predict:** in the length-normalization test, two documents each mention "apple" once; one has 3 words and one has 30. Which ranks first, and why?
