# Evals

An eval is a test suite for behaviour that isn't deterministic. Without one, every prompt change, model upgrade or retrieval tweak is a guess, and "it looked better on the three examples I tried" ships regressions. With one, you can change things quickly and know what broke.

## The parts

1. **Cases:** inputs plus what good looks like (an expected value, a reference answer, or properties to check). Tag them by category ("knockout match", "penalty shootout", "missing data") so you can see where things fail.
2. **The system under test:** the prompt, model, tools and code, called exactly as production calls it.
3. **Graders:**
   - *Exact or structured match* for extraction and classification. Cheap and unambiguous.
   - *Rule checks* for properties: valid JSON, length limits, every number in the summary appears in the source data.
   - *Model-graded* ("LLM as judge") for qualities like tone or helpfulness. Powerful, but the judge needs its own calibration: check it against human labels on a sample.
4. **A report:** pass rate overall and per tag, failures with reasons, cost and latency.

## Where cases come from

Start with 20-50 real examples, especially past failures and edge cases. Add every production bug as a new case. Synthetic cases are fine for coverage but check that they look like real traffic.

## Reading results honestly

A pass rate from 30 cases is noisy. 24/30 is 80%, but the 95% **Wilson interval** is roughly 63% to 91%. If version B scores 83% on the same 30 cases, that is not evidence it's better. Two habits help:

- Report the interval, not just the number.
- Compare **case by case**: which cases went from pass to fail (regressions) and fail to pass (fixes)? Five regressions hidden behind six fixes is a story the headline number hides.

**Predict:** baseline passes 50/100, candidate 80/100. Do their 95% intervals overlap? (No: about 40-60% vs. 71-87%. That difference is real.)

## Running evals well

- **Bounded concurrency:** run cases in parallel up to a limit so you don't hit rate limits.
- **Isolate failures:** one case throwing must not stop the run; record it as a failure with the error.
- **Pin everything:** model version, prompt version, temperature or effort, retrieval index. A result you can't reproduce isn't a result.
- **Run in CI** on prompt or model changes, with a threshold that blocks merges on clear regressions.

## In an interview

When asked "how would you know if this LLM feature works?", describe the case set (with tags and real failures), the graders (and how you'd validate a model judge), the metric with its uncertainty, and the regression check in CI. That answer separates engineers who have shipped LLM features from those who have demoed them.
