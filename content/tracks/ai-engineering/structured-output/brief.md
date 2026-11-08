# Structured output

The moment an LLM's output feeds code instead of a person (a pipeline step, a UI component, a database row), it has to be structured. Free text that is *usually* JSON is the source of most production LLM bugs.

## Three ways to get structure

| Approach | How | Trade-off |
| --- | --- | --- |
| Prompt only | Ask for JSON and show an example | Works most of the time; you must parse and validate everything |
| Schema-constrained output | Pass a JSON schema; the provider constrains decoding so the reply always matches it | Syntax is guaranteed; meaning still isn't |
| Tool call with a strict schema | Define a tool whose input is your structure; the model "calls" it | Natural for agents; same guarantee as above |

Use the strongest option your provider offers, and **still validate**. A schema can't say "the end date must be after the start date", "this id must exist in our database" or "the summary must not invent a score".

## Parse leniently, validate strictly

Real replies wrap JSON in prose ("Sure! Here's the data:") or code fences. A small, forgiving parser that finds the JSON payload saves many retries. Then validate strictly, collecting **all** errors, not just the first, with paths a model can act on: `scores[2].home must be a non-negative integer`.

## The repair loop

When validation fails, don't just retry the same prompt; the model will often make the same mistake. Append its bad reply and a message listing the exact errors, then ask again:

1. user: original prompt
2. assistant: the bad reply
3. user: "These problems need fixing: ... Reply with only the corrected JSON."

Bound it (2-3 attempts), log every failure with the errors, and decide what happens after the last attempt: fail the job, fall back, or route to a human. An unbounded loop is a cost incident waiting to happen.

**Predict:** a model returns `{"team": "Canada", "score": "3"}` and your schema wants `score` as an integer. Will a retry without the error message fix it? (Often not: the model has no signal about what was wrong.)

## Untrusted input

Model output can contain anything its inputs contained, including text an attacker planted in a document. Validate it before it reaches a database, never build SQL or shell commands from it by string concatenation, and escape it before rendering as HTML.

## In production pipelines

A typical generation pipeline (for example, writing match summaries from a sports data feed) looks like: fetch facts → prompt with the facts → structured output → validate against the facts (did it invent a score?) → publish or send for review. The validation step is where most of the engineering is. The evals module shows how to measure it.
