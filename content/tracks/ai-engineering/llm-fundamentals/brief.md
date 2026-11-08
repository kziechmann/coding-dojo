# LLM fundamentals for engineers

You don't need to know how transformers are trained to build good LLM systems, but you do need a working model of the four things every request spends: **tokens, context, money and time.**

## Tokens

Models read and write tokens, not characters. In English, a token is about 4 characters or three-quarters of a word; code and non-English text use more tokens per character. Always measure with the provider's token counter before relying on a guess.

## The context window

The context window is the total a model can attend to in one request: system prompt, conversation, documents, tool definitions and results, **and** the response it writes. Leave room for the output, or the response gets cut off mid-sentence.

Bigger is not automatically better. Long contexts cost more, take longer to process, and can bury the instruction that matters. Put long reference material first and the question last, and include only what the task needs.

## Cost

Providers bill input and output tokens separately, and output tokens cost several times more than input. Reasoning ("thinking") tokens are billed as output. Two levers matter most:

- **Prompt caching.** If the beginning of a request is byte-for-byte identical to a recent one, that prefix can be served from cache at a fraction of the input price. It is a prefix match: change one character early on and everything after it misses. So put stable content first (system prompt, tool definitions, reference docs) and volatile content last (the user's message, timestamps).
- **Model and effort choice.** A smaller model or lower reasoning effort is often good enough for simple routes such as classification and extraction. Measure quality with evals before switching.

## Latency

Two numbers: **time to first token** (grows with input size, shrinks with caching) and **output speed** (tokens per second). Long answers are slow because of output length, not input. Streaming doesn't make the total faster, but users see progress immediately, which is what they perceive.

**Predict:** a request has a 40,000-token prompt (35,000 of it a cached document) and produces 800 tokens. Which part dominates the time the user waits? (Usually generating the 800 output tokens: the cached prefix is processed quickly.)

## Packing a context on a budget

When everything doesn't fit, you choose. A typical priority order:

1. System prompt and the current question: always.
2. A reserve for the output.
3. Retrieved documents, best first, but capped so they can't crowd out the conversation.
4. Recent conversation, newest first, as a contiguous run (a reply without the question before it confuses the model).
5. Whatever space is left: more documents.

Older turns can be summarized instead of dropped. Whatever you choose, make it deterministic and testable, which is exactly the exercise.

## Habits worth having

- Log token counts and cost per request from day one.
- Treat model output as untrusted input: validate it, and never pass it straight into a shell or SQL.
- Keep prompts in version control and change them with an eval run, like code.
