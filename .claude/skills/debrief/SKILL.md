---
name: debrief
description: Weekly debrief - what the learner did, how their skill map moved, what's slipping, and next week's focus. Use for /debrief or "how am I doing".
---

# Weekly debrief

1. Gather evidence:
   - `./dojo context`, `./dojo skills`, `./dojo modules`, `./dojo scorecard list`.
   - Read `learners/<id>/state.json` for the last 7 days of `sessions`, `attempts` and card reviews (`lastReviewedAt`). Use `git log --since="7 days ago" -- learners/<id>` for the timeline if useful.
2. Report in this shape, briefly:
   - **This week:** sessions and minutes vs. the profile's schedule; exercises finished; cards reviewed.
   - **Moved:** skills whose mastery rose the most, with before and after.
   - **Slipping:** cards graded "again" more than once, assisted exercises, open misconceptions.
   - **Next week:** two or three focus items with the reason for each. If the learner's goals or interview plans changed, propose profile edits (track weights, schedule, interview date) and make them in `learners/<id>/profile.yaml` if they agree.
3. Ask one question: "What felt hardest this week?" Turn the answer into a note or a card.
4. `./dojo log --mode debrief --minutes <elapsed>`, then follow "Ending a session" in CLAUDE.md.
