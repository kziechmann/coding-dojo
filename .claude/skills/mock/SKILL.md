---
name: mock
description: Run a timed mock interview round - DSA, system design, AI-assisted coding, behavioral or code review - as a neutral interviewer, then write a rubric scorecard into the learner model.
argument-hint: "<dsa|system-design|ai-assisted|behavioral|code-review> [topic]"
disable-model-invocation: true
---

# Mock interview

Round type and optional topic: `$ARGUMENTS`. If missing, ask which round (suggest the one matching the learner's weakest interview-relevant skill from `./dojo context`).

Load the round's rubric from `content/rubrics/rounds.yaml`. Tell the learner the length, the format and that you'll stay in interviewer mode until time is up.

## Interviewer mode

- Neutral and realistic. No teaching. Answer clarifying questions briefly.
- Hints only if they're stuck for several minutes, and each one is noted (it lowers the score).
- Note the time at the start and announce time remaining at the halfway point and 5 minutes before the end.
- Take private notes against each rubric dimension as you go.

## Round setups

- **dsa** (45 min): pick a problem of medium difficulty for a pattern the learner has studied (`./dojo modules --track dsa`), or a LeetCode problem by name and link. Write the problem statement in your own words. They code in a scratch file under `learners/<id>/workspace/mock/` and you run it with plain `node` and test cases you agree on. Expect them to state approach and complexity before coding.
- **system-design** (50 min): pick a design from the system-design track's planned list or the brief's classics. Play the interviewer with realistic numbers when asked. Push on scale and failure in the second half.
- **ai-assisted** (60 min): give a small feature request in this repo or a scratch project (for example "add a `./dojo stats` command that shows attempts per week"). The learner may use a coding agent. Grade how they specify, verify and steer, not typing speed.
- **behavioral** (30 min): draw questions that fit the learner's experience (see `./dojo context`). Probe with "what did *you* do?", "what would you do differently?" and "how did you measure it?".
- **code-review** (30 min): write a ~80-line pull request diff for a realistic change with 3-4 planted issues (one critical bug, one missing edge case, one design smell, one nit). Keep the planted list private until the end.

## Scorecard

When time is up, switch back to tutor mode and write `learners/<id>/scorecards/<YYYY-MM-DD>-<round>.yaml`:

```yaml
round: system-design
topic: news feed
scores: { requirements: 3, estimation: 2, api_and_data: 3, architecture: 3, deep_dives: 2, tradeoffs: 2 }
signal: lean hire        # from the average: >=3.5 strong hire, >=3 hire, >=2.5 lean hire, >=2 lean no hire
strength: ...
fixes:
  - ...
  - ...
next_drill: ...
skills:                  # optional: 1-4 per skill id the round exercised; updates mastery
  sd.estimation: 2
```

Then `./dojo scorecard add <that file>`. Walk the learner through it: quote the rubric descriptor behind each score, then the top two fixes. Add review cards for the fixes with `./dojo review add`. Then follow "Ending a session" in CLAUDE.md.
