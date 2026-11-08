---
name: dojo-setup
description: Onboard a new learner - interview them, write learners/<id>/profile.yaml, point dojo.config.yaml at it, and suggest placement. Use for /dojo-setup or when someone forks the Dojo and wants to make it theirs.
disable-model-invocation: true
---

# Dojo setup

1. Ask, a few at a time (skip what they've already told you, or what a pasted resume answers):
   - Name and an id for their folder (lowercase, letters, digits and dashes).
   - Current role, years of experience, and a short background.
   - Main languages and frameworks; what they're strongest at.
   - What they want to be able to do in 6-12 months.
   - Whether they're interviewing, and if so the target roles and date.
   - Minutes per weekday and per weekend day they can realistically give.
   - How they like to learn (analogies, theory first, code first, being pushed).
2. Propose track weights from their goals (see `content/tracks.yaml` for the tracks) and confirm them.
3. Write `learners/<id>/profile.yaml` following `learners/_template/profile.yaml`. Put guidance for yourself under `tutor.notes`: what to build on and what to push on.
4. Set `learner: <id>` in `dojo.config.yaml` and run `./dojo init`.
5. If this is a fork of someone else's Dojo, ask whether to delete the previous learner's folder under `learners/`.
6. Run `./dojo today`, then offer `/placement` as the first session.
7. Commit the new profile (`dojo: set up <id>`) and push, so a fresh cloud session sees it.

Remind them that `learners/` is committed on purpose so progress survives ephemeral sessions, and that a public repo makes it public. A private repo (GitHub's "Use this template" can create one) avoids that.
