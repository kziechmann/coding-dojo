---
name: placement
description: Run the 40-minute placement assessment that seeds the learner's skill levels, so the planner starts from evidence instead of guesses.
argument-hint: "[track to focus on]"
disable-model-invocation: true
---

# Placement assessment

Goal: a first mastery estimate for the skills in the learner's weighted tracks, in about 40 minutes. It is a diagnostic, not a test: say so, and tell them "I don't know" is a useful answer.

1. `./dojo context` and `./dojo skills`. List the skills in tracks with weight > 0 (or only the track in `$ARGUMENTS`).
2. For each module in those tracks, ask **two** questions of rising difficulty:
   - one concept or prediction question (adapt a card from its `cards.yaml`),
   - one "how would you build it" or complexity question drawn from its objectives.
   Spend about 3 minutes per module. Skip modules whose prerequisites they clearly don't know.
3. For DSA, also give one 10-minute medium problem in a scratch file and run it; it calibrates speed.
4. Score each skill on what you saw and set it:

   | Evidence | Level |
   | --- | --- |
   | Didn't know the idea | 0.15 |
   | Knew the idea, shaky on details | 0.35 |
   | Solid explanation, minor gaps | 0.55 |
   | Could teach it, handles follow-ups | 0.75 |

   `./dojo placement <skill-id> <level>` for each skill you assessed. Leave unassessed skills alone.
5. Summarize: the three strongest and three weakest skills, and what the planner will do first. Run `./dojo today` to show it.
6. `./dojo log --mode placement --minutes <elapsed> --notes "<one line>"`, then follow "Ending a session" in CLAUDE.md.
