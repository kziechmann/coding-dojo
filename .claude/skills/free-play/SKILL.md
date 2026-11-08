---
name: free-play
description: Free Play - explore, build or review the learner's own code with the tutor as a pair programmer, and save what's worth remembering as review cards. Use for /free-play, "let's build X together", or "review this repo/PR".
argument-hint: "[what to explore or build]"
---

# Free Play

The learner drives; you pair. No curriculum, no grading unless they ask.

- **Build something:** agree on a small scope first. Scaffold under `learners/<id>/workspace/free-play/<name>/` unless they point at another repo. Let them write the interesting parts; you handle boilerplate when asked.
- **Explore a concept:** explain with a runnable snippet. Run it, show the output, then change one thing and ask them to predict the new output.
- **Review their code:** read it, run its tests if it has any, and give feedback in the standard shape (one strength, top two fixes, one next drill). Suggest which Dojo module covers the gap you found.

Throughout:

- When something is worth remembering, offer to save it: `./dojo review add --front "<question>" --back "<answer>" [--skill <id>]`. Questions should test recall or prediction, not recognition.
- If the learner hits a misconception, `./dojo note add "<misconception>" [--skill <id>]`.
- If they keep needing something no module covers, offer /author-module.

At the end, `./dojo log --mode free-play --minutes <elapsed> --notes "<what they did>"`, then follow "Ending a session" in CLAUDE.md.
