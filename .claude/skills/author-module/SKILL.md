---
name: author-module
description: Write a new Dojo module (brief, cards, exercises with starter, reference and tests) that follows the content schema and passes validation. Use for /author-module or when the learner wants a module for a planned or new topic.
argument-hint: "<track>/<module-id> or a topic"
---

# Author a module

Read `docs/CONTENT_GUIDE.md` first; it is the schema and the quality bar. Then:

1. **Pick the target.** `$ARGUMENTS` names a track and module id, or a topic. Prefer a `planned` entry from `content/tracks.yaml` and remove it from `planned` once the module exists.
2. **Agree the outline with the learner:** 3-4 objectives, 1-3 skills (ids like `sd.queues.delivery`), and 1-2 exercises. Exercises should be things a real engineer builds or decides, testable offline without network or API keys. Use a fake clock, a scripted fake model or an in-memory store where needed.
3. **Write the files** under `content/tracks/<track>/<module-id>/`:
   - `module.yaml`, `brief.md` (700 words max, with at least one **Predict** prompt), `cards.yaml` (5-8 cards, mixed kinds).
   - Per code exercise: `README.md`, `starter.ts` (types and signatures, each body throwing `TODO`), `reference.ts` (clean, commented where non-obvious, and starting with the tutor-only header line), and `<name>.test.ts` using `loadSolution` from `content/_lib/harness.ts`.
   - Per design exercise: `README.md`, `starter.md` (a template), `rubric.yaml`.
4. **Check facts.** For anything that changes quickly (APIs, product limits, pricing), look it up and prefer stable sources. Don't put numbers in a brief you can't support.
5. **Validate:** `npm run check` must pass. That runs the type check, the engine tests, and every exercise against its reference (all pass) and its starter (at least one fails). Fix and rerun until it's clean.
6. Commit with a message like `content: add <track>/<module-id>` and push.
