# Coding Dojo

A personal training dojo for software engineers, with Claude Code as the tutor. It plans each session from your goals and weak spots, teaches with short briefs and "predict first" questions, has you build real things against hidden tests, schedules reviews so you keep what you learn, and runs mock interviews with rubric scorecards.

It starts with the two areas most engineers want to level up right now: **system design** and **AI engineering**. Data structures and algorithms come next, with more tracks outlined and ready to be written.

## What's inside

| Track | Modules you can play today | Planned |
| --- | --- | --- |
| System design | Estimation · Rate limiting · Caching · Consistent hashing · Retries and idempotency · Design: URL shortener | API design, databases, replication, queues and workflows, consensus, observability, more classic designs |
| AI engineering | LLM fundamentals (context packing) · Structured output · The agent loop · Retrieval (BM25, recall@k) · Evals | MCP servers, Claude Agent SDK, embeddings and hybrid search, LLM pipelines, prompt injection, judges |
| DSA | Arrays and hashing · Sliding window | Two pointers through dynamic programming |
| Craft, build-your-own, media engineering, experimentation, interview readiness | outlines | the tutor can write these with `/author-module` |

Every coded exercise has a starter, hidden tests and a reference solution the tutor keeps to itself until you ask for the full answer. AI exercises run offline against scripted fake models, so no API key is needed.

## Quick start

You need Node.js 22.18 or newer (24 LTS recommended) and Claude Code.

```bash
git clone <your copy of this repo> && cd coding-dojo
npm install
./dojo today          # what the planner suggests right now
```

Then open Claude Code in the folder and type `/today`.

### Make it yours

1. Create your own copy. GitHub's **Use this template** gives you a private repo, which matters because your progress is committed (see below).
2. In Claude Code, run `/dojo-setup`. The tutor interviews you, writes `learners/<you>/profile.yaml`, and points `dojo.config.yaml` at it. Or copy `learners/_template/` by hand.
3. Run `/placement` once (about 40 minutes) so the planner starts from evidence.

## Daily use

| Command | What happens |
| --- | --- |
| `/today` | Reads your context, shows the plan (reviews first, then the highest-value lesson), and starts it |
| `/lesson [module or exercise]` | Brief, worked example with predictions, a coded exercise with tests and a hint ladder, recall check |
| `/review` | Spaced-repetition cards scheduled by FSRS |
| `/mock <round>` | Timed DSA, system design, AI-assisted, behavioral or code-review round with a scorecard |
| `/free-play` | Pair on anything: build, explore, or review your own code; save what you learn as cards |
| `/debrief` | Weekly: what moved, what's slipping, next week's focus |
| `/author-module` | Write a new module that passes validation |

Every skill calls the `./dojo` CLI, which you can also use directly. Run `./dojo help` for the list.

## How it works

- **Content** (`content/`): each module has a `module.yaml` (objectives, skills, exercises), a `brief.md`, `cards.yaml`, and exercises with `starter.ts`, `reference.ts` and tests. Design exercises have a template and a rubric.
- **Learner model** (`learners/<id>/state.json`): an Elo-style mastery rating per skill, updated from test results, hints used and time; FSRS review state per card; attempts, sessions, notes and scorecards.
- **Planner** (`./dojo today`): due reviews first, then exercises ranked by your track weights, skill gaps, prerequisites and how recently you worked each track.
- **Sandbox** (`./dojo test`): runs tests in a local Node process with a timeout by default. Set `sandbox: auto` or `docker` in `dojo.config.yaml` to run them in Docker with no network, a read-only filesystem and CPU, memory and process limits (`--dry-run` prints the command).
- **Progress persistence:** `learners/` is committed, and the tutor commits and pushes at the end of each session, so progress survives ephemeral cloud sessions. Keep your repo private if you don't want it public.

## Contributing content

Read `docs/CONTENT_GUIDE.md`, then `npm run check`. A module is accepted when the type check passes, every reference solution passes its tests, and every starter fails them.

## Roadmap

This is Phase 0 of `docs/SPEC.md`: the dojo runs inside Claude Code. Later phases add a local web app with an editor, execution visualizers, a whiteboard for design rounds, and system-design labs you can break on purpose.
