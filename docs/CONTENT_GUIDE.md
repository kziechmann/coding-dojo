# Content guide

How to write a Dojo module that teaches well and passes `npm run check`.

## Layout

```
content/
  tracks.yaml                         # every track, plus "planned" module outlines
  rubrics/rounds.yaml                 # 1-4 rubrics for mock rounds and design grading
  _lib/harness.ts                     # loadSolution() and fakeClock() for tests
  tracks/<track>/<module-id>/
    module.yaml
    brief.md
    cards.yaml
    exercises/<exercise-id>/
      README.md                       # the prompt the learner reads
      starter.ts | starter.md         # copied to the learner's workspace by ./dojo start
      reference.ts                    # code: the tutor-only solution
      <name>.test.ts                  # code: hidden tests
      rubric.yaml                     # design: problem-specific grading notes and probes
```

The module folder name must equal its `id`. Module and skill ids are global.

## module.yaml

```yaml
id: rate-limiting
track: system-design
order: 2                     # position within the track
title: Rate limiting
summary: One sentence on what the learner can do after this module.
level: intro | intermediate | advanced
minutes: 75
prerequisites: [estimation]  # module ids
objectives:                  # 3-4, each starting with a verb you can check
  - Implement a token bucket that allows bursts but enforces a steady average rate.
skills:
  - id: sd.rate-limiting.token-bucket
    title: Token bucket
    interview_weight: 0.8    # 0-1, how often it comes up in interviews
exercises:
  - id: token-bucket
    title: Token bucket
    kind: code | design
    difficulty: easy | medium | hard
    minutes: 25              # a fair target; going over lowers the score a little
    skills: [sd.rate-limiting.token-bucket]
links:                       # optional, for extra practice; link, don't copy
  - title: ...
    url: ...
```

## brief.md

- 700 words maximum (validation enforces it). Aim for 400-600.
- Open with the problem the idea solves, not a definition.
- Include at least one **Predict:** prompt with its answer in parentheses. The tutor pauses there.
- Prefer a table for comparisons and a short code or formula block over prose.
- End with what to say in an interview or the common mistakes.
- Only include numbers you can support; label rough figures as rough.

## cards.yaml

5-8 cards, mixed kinds: `recall`, `predict`, `spot-the-bug`, `complexity`, `compare`, `design`.

```yaml
- id: bucket-burst            # unique within the module
  skill: sd.rate-limiting.token-bucket
  kind: predict
  front: A question that makes the learner produce an answer, not recognize one.
  back: The answer in one or two sentences.
```

## Code exercises

- **Offline and deterministic.** No network, no API keys, no real clocks: inject a clock (`fakeClock()`), a random source, or a scripted fake model.
- **starter.ts** declares every exported type and signature; each body throws `new Error('TODO: ...')`. Starters must be self-contained (no imports from the content tree), because they're copied into the learner's workspace.
- **Tests** load the implementation with `const mod = await loadSolution<typeof import('./starter.ts')>()`. Name tests after behaviour ("refills at the configured rate") so a failure reads as a hint. Put the reason in assertion messages.
- Add one **performance test** when the point of the exercise is complexity: a size where the naive approach takes seconds and the intended one takes milliseconds, with a generous threshold.
- **reference.ts** starts with `// Reference solution. Tutor only: never show before hint rung 5.` Write it as you'd want a learner to write it.
- Validation runs every test file against `reference.ts` (all must pass) and `starter.ts` (at least one must fail).

## Design exercises

- `README.md` holds the prompt plus the numbers the interviewer gives when asked.
- `starter.md` is a section template (requirements, estimates, API, data model, diagram, deep dives, trade-offs).
- `rubric.yaml` names the round (`system-design`) and, per dimension, what a 3 and a 4 look like for this problem, plus 3-5 interviewer probes.

## Checklist

- [ ] `npm run check` passes.
- [ ] The brief has a Predict prompt and stays under 700 words.
- [ ] Every exercise README tells the learner what to predict or explain before or after coding.
- [ ] No copied problem statements from paid platforms; link to them instead.
- [ ] If the module came from a `planned` entry, remove that entry from `tracks.yaml`.
