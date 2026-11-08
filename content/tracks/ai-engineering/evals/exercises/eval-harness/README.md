# Eval harness with regression checks

Implement `wilsonInterval`, `exactMatch`, `runEval` and `compareRuns` in `solution.ts`. This is the harness you'll later point at real prompts (including the Dojo's own tutor).

## `wilsonInterval(passes, n, z = 1.96): [low, high]`

```
p = passes / n
center = (p + z²/(2n)) / (1 + z²/n)
margin = z × sqrt(p(1 − p)/n + z²/(4n²)) / (1 + z²/n)
```

Return `[center − margin, center + margin]`, clamped to [0, 1]. With `n = 0`, return `[0, 1]`.

## `exactMatch` (a grader)

Passes when the output deep-equals `case.expected`, ignoring object key order. Score 1 or 0.

## `runEval(cases, system, grader, { concurrency = 4 })`

- Run `system(case.input)` then `grader(output, case)` for every case. Graders may be async. A grader result's `score` defaults to 1 when it passes and 0 when it fails.
- Never run more than `concurrency` cases at once.
- If `system` or `grader` throws, that case fails with `score: 0` and `error` set to the error message. The run continues.
- `results` are in the same order as `cases`, each `{ id, pass, score, tags, reason?, error? }` (`tags` defaults to `[]`).
- `passRate` is passes ÷ cases (0 when there are no cases), and `ci95` is the Wilson interval.
- `byTag[tag]` is `{ n, passRate }` over cases with that tag.

## `compareRuns(baseline, candidate)`

- `regressions`: ids that pass in the baseline but fail in the candidate. `fixes`: the reverse. Only ids present in both runs count.
- `delta`: candidate pass rate minus baseline pass rate.
- `significant`: `true` only when the two `ci95` intervals don't overlap.

**Afterwards:** tell the tutor which grader you'd use for "the match summary doesn't invent a score", and how you'd check that grader is right.
