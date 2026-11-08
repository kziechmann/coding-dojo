---
name: lesson
description: Teach a Dojo module or coach the learner through one of its exercises - brief, worked example with predictions, guided exercise with tests and the hint ladder, recall check, and recording the attempt. Use for /lesson, "teach me X", "let's do the rate limiter exercise", or a lesson/exercise/resolve item from /today.
argument-hint: "[module or exercise id]"
---

# Lesson

Follow CLAUDE.md's tutor rules. The target is `$ARGUMENTS`; if empty, run `./dojo today` and take the top lesson or exercise item.

## 1. Orient (1-2 min)

- `./dojo context` if you haven't this session.
- `./dojo show <module>` for objectives, skills, exercises and file paths, then read the module's `brief.md`.
- If the target is an exercise the learner has already started, skip to step 4.

## 2. Teach the brief (8-10 min)

Don't paste the brief. Teach it Socratically:

- Open with the problem the idea solves, tied to the learner's own experience (see tutor notes in context).
- Walk the brief's worked example, stopping at each **Predict** prompt. The learner commits to an answer before you reveal it.
- Draw when it helps: a Mermaid diagram for flows and architecture, a small table for comparisons.
- Check one objective with a question before moving on. A vague answer gets one follow-up, then a short explanation.

## 3. Start the exercise

- `./dojo start <exercise>` creates the learner's workspace file and queues the module's review cards.
- Read the exercise `README.md` with the learner. Ask them to state their approach (and for DSA, complexity) before coding.
- For **design** exercises, the learner writes in the workspace `design.md`; you play the interviewer using the rubric's probes, then grade (step 6).

## 4. Coach the code

- The learner writes the code. Edit their workspace file only when they ask you to type something specific, or at hint rung 4-5.
- Run `./dojo test <exercise>` whenever they want feedback, and base feedback on its real output: quote the failing case and the error.
- When stuck, climb the hint ladder **one rung at a time** and track the highest rung used:
  1. A nudge question.
  2. Name the pattern or concept.
  3. Pseudocode outline.
  4. Code for only the stuck part.
  5. The full solution, walked through (you may read `reference.ts` now).
- Before rung 5 you may read `reference.ts` to calibrate hints, but never quote it.

## 5. Close the loop (3-5 min)

- All tests green: ask them to explain the solution back in two sentences and state its complexity.
- Ask the three most important review questions from the module's `cards.yaml` as a recall check (don't grade them in FSRS; they're queued for tomorrow).
- Record: `./dojo attempt <exercise> --hints <highest rung> --minutes <elapsed>` (add `--give-up` if they stopped without passing).
- Give feedback in the standard shape (CLAUDE.md): rubric scores where relevant, one strength, top two fixes, one next drill.

## 6. Grading a design exercise

Score each dimension in the exercise's `rubric.yaml` 1-4, quoting the descriptor from `content/rubrics/rounds.yaml` you matched. Ask at least two of the rubric's probes first. Then `./dojo attempt <exercise> --score <average / 4> --hints <rung> --minutes <elapsed>`.

## 7. End

Follow "Ending a session" in CLAUDE.md.
