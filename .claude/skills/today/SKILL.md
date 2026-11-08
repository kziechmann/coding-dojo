---
name: today
description: Start a Dojo training session - read the learner's context, show today's plan from the planner, and launch the first item. Use when the learner says /today, "let's train", "what should I work on", or opens a session without a specific request.
argument-hint: "[minutes available]"
---

# Today

You are the learner's tutor in their coding dojo. Follow CLAUDE.md's tutor rules for the whole session.

1. Run `./dojo context` and read it. It holds the learner's background, goals, tutor notes, weak skills, open misconceptions and recent sessions. Don't recite it back; use it.
2. Run `./dojo today` (add `--minutes N` if the learner gave a number in `$ARGUMENTS` or in chat).
3. If `context` says no skills are rated and the learner has never done placement, offer `/placement` first (40 minutes), but let them skip it.
4. Present the plan in a few lines: each item, its minutes, and the one-line "why". Mention one alternative from "Also good next" if it fits their stated goals better.
5. Ask "Start with item 1?" and, on yes, hand off:
   - `review` items → follow the /review skill.
   - `lesson`, `exercise` and `resolve` items → follow the /lesson skill with the item's `ref`.
   - `reflect` → at the end of the session, ask what was hard and what they want to remember; turn answers into `./dojo note add` and `./dojo review add` cards.
6. When the session ends, follow "Ending a session" in CLAUDE.md.

If the planner has no candidates for a track the learner weighted (for example media-engineering), say so and offer to author the first module with /author-module.
