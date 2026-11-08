# Extract with a repair loop

Implement `parseJsonLoose` and `extract` in `solution.ts`. The tests use a scripted fake model, so no API key is needed; swapping in a real client later is a one-line change.

## `parseJsonLoose(text): unknown`

Find and parse the JSON in a model reply:

1. If the text contains a fenced code block (```` ```json ```` or just ```` ``` ````), parse the contents of the first one.
2. Otherwise, take everything from the first `{` or `[` (whichever comes first) through the last matching closer (`}` for `{`, `]` for `[`), and parse that.
3. If there's nothing to parse, or it isn't valid JSON, throw a `SyntaxError`.

## `extract(model, prompt, validate, { maxAttempts = 3 })`

```ts
const { value, attempts } = await extract(model, 'Extract the final score as {"home": n, "away": n}', validateScore);
```

1. Start the conversation with `{ role: 'user', content: prompt }`.
2. Call `model(messages)`; append the reply as an `assistant` message.
3. Parse with `parseJsonLoose`. If that throws, the errors are `[`Invalid JSON: ${error.message}`]`. Otherwise run `validate(value)`.
4. If valid, return `{ value, attempts, messages }`.
5. If not, and attempts remain, append a `user` message that contains **every** error string and asks for only the corrected JSON. Go to step 2.
6. After `maxAttempts` failures, throw `ExtractionError` (provided in the starter) with `attempts` and the last `errors`. Don't append a repair message after the final failure.

**Afterwards:** tell the tutor what you'd log for each failed attempt in production, and what should happen after the last one.
