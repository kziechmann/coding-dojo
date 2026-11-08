# Context packer

Write `pack()` in `solution.ts`: given a token budget, choose which conversation messages and retrieved documents go into a request. Token counts are given; you don't need a tokenizer.

## Rules

Let **available** = `budget − reserveForOutput − system.tokens − question.tokens`. Throw a `RangeError` if it is negative.

1. **Documents, first pass.** Documents may use at most `floor(available / 2)` tokens in this pass. Go through them best `score` first (ties keep their original order). Include each one that still fits; skip one that doesn't and keep trying the rest.
2. **History.** Walk from the newest message to the oldest, adding each one while it fits in what's left of `available`. Stop at the first message that doesn't fit: history must be a contiguous run of the newest messages. If the oldest kept message is from the `assistant`, drop it too, so the history starts with a `user` turn.
3. **Documents, second pass.** Any space still left may be used by documents that weren't included, again best score first, skipping ones that don't fit.
4. **Result:**
   - `docs` sorted by score, best first (ties in original order).
   - `history` in chronological order.
   - `usedTokens` = system + question + kept history + kept docs.
   - `droppedHistory` and `droppedDocs` are the counts left out.

**Predict before coding:** available = 1,000, documents of 600, 300 and 200 tokens (scores 0.9, 0.8, 0.7), and 100 tokens of history. Which documents make it in?

**Afterwards:** tell the tutor one situation where you'd change this policy (for example, summarizing old turns instead of dropping them).
