# Retrieval (RAG) fundamentals

Retrieval-augmented generation (RAG) answers questions from your own documents: find the few passages that matter, put them in the prompt, and ask the model to answer from them. The model part is easy. **Retrieval quality decides answer quality**: if the right passage isn't retrieved, the best model in the world will guess.

## The pipeline

1. **Chunk** documents into passages.
2. **Index** them (keyword index, vector index, or both).
3. **Retrieve** the top k chunks for a query.
4. Optionally **rerank** the top 50-100 with a more expensive model and keep the best few.
5. **Generate** with the chunks in context, asking the model to cite them.

## Chunking

Too small and a chunk loses the context that makes it meaningful ("He scored twice" — who?). Too large and you waste context and dilute relevance. A few hundred tokens with some **overlap** between neighbours is a common start, so a sentence split across a boundary still appears whole in one chunk. Split on structure (headings, paragraphs) when you have it. Adding a short note of where a chunk came from ("From the 2026 World Cup group stage report: ...") helps both search and the model.

## Keyword search: BM25

BM25 scores a document for a query by summing, over query terms:

- **IDF:** rare terms matter more. "offside" says more than "the".
- **Term frequency with saturation:** the 2nd mention counts less than the 1st, and the 20th barely counts. Controlled by `k1` (about 1.2).
- **Length normalization:** a match in a short document counts more than the same match in a long one. Controlled by `b` (about 0.75).

idf(t) = ln(1 + (N − n_t + 0.5) / (n_t + 0.5))

score = Σ idf(t) × tf × (k1 + 1) / (tf + k1 × (1 − b + b × dl / avgdl))

BM25 is fast, needs no model, and is excellent at exact names, codes and jargon, which embeddings can blur.

## Embeddings, hybrid and reranking

Embedding search matches meaning ("goalkeeper" ≈ "keeper") but can miss exact identifiers. **Hybrid search** runs both and merges the lists, commonly with reciprocal rank fusion. A **reranker** then reorders the top candidates with a model that reads query and chunk together. Each step adds cost and latency, so add them when measurement says they help.

## Measure it

Build a small labelled set: queries plus the ids of chunks that answer them. Then track **recall@k**: of the relevant chunks, how many appear in the top k? If recall@5 is 60%, the generator is missing the answer 40% of the time, and no prompt can fix that.

**Predict:** query "Messi penalty" against two chunks: a short one mentioning Messi once, and a long match report mentioning Messi five times among 2,000 words. Which does BM25 rank higher? (Often the short one: saturation caps the five mentions and length normalization penalizes the long report.)

## In an interview

Walk the pipeline, name chunk size and overlap as tunable, explain why hybrid beats either alone on mixed queries, and insist on recall@k on a labelled set before tuning prompts.
