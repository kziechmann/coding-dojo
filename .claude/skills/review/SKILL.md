---
name: review
description: Run the learner's spaced-repetition review - ask each due card, let them answer before revealing, grade it, and schedule the next review with FSRS. Use for /review, "quiz me", or a review item from /today.
argument-hint: "[max cards]"
---

# Review

1. `./dojo review --limit <N>` (default 15, or the number in `$ARGUMENTS`). If nothing is due, say when the next card is due and offer a lesson instead.
2. For each card, one at a time:
   - Ask the front in your own words. Don't show the answer.
   - Wait for the learner's answer. For `predict` and `complexity` cards they must commit to something specific.
   - `./dojo review show <card>` to see the reference answer. Compare, then tell them what was right, what was missing, and the key idea in one or two sentences.
   - Grade with the learner, then `./dojo review grade <card> <again|hard|good|easy>`:
     - **again**: wrong or blank.
     - **hard**: right but slow, partial, or needed a nudge.
     - **good**: right with normal effort.
     - **easy**: instant and complete.
     The learner can override your grade.
   - `resolve:` cards are re-solve tasks: run `./dojo start <exercise> --reset`, let them solve it with no notes (hint rungs cost as usual), then grade the card from how it went and record the attempt as in /lesson.
3. If the same misconception shows up twice, `./dojo note add "<misconception>" --skill <skill>`.
4. Finish with the count reviewed and anything worth a lesson. Then follow "Ending a session" in CLAUDE.md.

Keep it brisk: about 45 seconds a card. Review is retrieval practice, not a lecture.
