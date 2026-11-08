import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import YAML from 'yaml';
import { loadConfig, type DojoConfig, type SandboxMode } from './config.ts';
import { findExercise, findModule, loadCatalog } from './content/loader.ts';
import type { Catalog, Exercise, Module } from './content/types.ts';
import { solutionIssues, structuralIssues } from './content/validate.ts';
import { masteryOf } from './learner/mastery.ts';
import { loadProfile, type Profile } from './learner/profile.ts';
import {
  applySkillScore,
  isDone,
  moduleComplete,
  moduleMastery,
  recordAttempt,
  setSkillMastery,
  skillMastery,
  startExercise,
} from './learner/progress.ts';
import { CUSTOM_PREFIX, dueCards, enrollCard, gradeCard, isGradeName, RESOLVE_PREFIX } from './learner/review.ts';
import { LearnerStore } from './learner/store.ts';
import type { LearnerState } from './learner/types.ts';
import { planToday } from './planner/today.ts';
import { dockerArgs, runExerciseTests, testFiles } from './runner/run.ts';

const HELP = `dojo - your training dojo's engine. The Claude Code skills call these; you can too.

Daily
  today [--minutes N] [--json]       Plan today's session from due reviews and your weakest areas
  context                            Learner summary for the tutor to read at session start
  review [--limit N] [--json]        List due review cards (fronts only)
  review show <card>                 Show a card's answer
  review grade <card> <again|hard|good|easy>
  review add --front "..." --back "..." [--skill id]   Save your own card

Exercises
  modules [--track id]               Tracks, modules and your progress
  show <module|exercise>             Details and file paths
  start <exercise> [--reset]         Copy the starter into your workspace and queue the module's cards
  test <exercise> [--reference] [--solution path] [--sandbox auto|local|docker] [--json] [--dry-run]
  attempt <exercise> --hints 0-5 --minutes N [--score 0-1] [--give-up] [--notes "..."]

Learner model
  skills [--track id]                Mastery per skill
  placement <skill> <0-1>            Set a skill level from the placement assessment
  log --mode <mode> --minutes N [--track id] [--module id] [--notes "..."]
  note add "text" [--skill id] | note resolve <id> | note list
  scorecard add <file.yaml> | scorecard list

Setup and content
  init                               Create state for the learner in dojo.config.yaml
  validate [--solutions]             Check content; --solutions also runs every test suite
`;

const OPTIONS = {
  minutes: { type: 'string' },
  json: { type: 'boolean' },
  track: { type: 'string' },
  module: { type: 'string' },
  reset: { type: 'boolean' },
  solution: { type: 'string' },
  reference: { type: 'boolean' },
  sandbox: { type: 'string' },
  hints: { type: 'string' },
  score: { type: 'string' },
  'give-up': { type: 'boolean' },
  notes: { type: 'string' },
  limit: { type: 'string' },
  front: { type: 'string' },
  back: { type: 'string' },
  skill: { type: 'string' },
  mode: { type: 'string' },
  solutions: { type: 'boolean' },
  'dry-run': { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
} as const;

type Flags = ReturnType<typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true }>>['values'];

class UsageError extends Error {}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const bar = (n: number, width = 10) => {
  const filled = Math.round(Math.min(1, Math.max(0, n)) * width);
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)} ${pct(n).padStart(4)}`;
};
const day = (iso: string) => iso.slice(0, 10);

function num(v: string | undefined, name: string, opts: { min?: number; max?: number } = {}): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new UsageError(`--${name} must be a number`);
  if (opts.min !== undefined && n < opts.min) throw new UsageError(`--${name} must be at least ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) throw new UsageError(`--${name} must be at most ${opts.max}`);
  return n;
}

function requireArg(v: string | undefined, usage: string): string {
  if (!v) throw new UsageError(`usage: ./dojo ${usage}`);
  return v;
}

interface Ctx {
  config: DojoConfig;
  catalog: Catalog;
  now: Date;
  out: (s?: string) => void;
}

interface LearnerCtx extends Ctx {
  profile: Profile;
  store: LearnerStore;
  state: LearnerState;
}

function withLearner(ctx: Ctx): LearnerCtx {
  const profile = loadProfile(ctx.config.learnersDir, ctx.config.learner);
  const store = new LearnerStore(ctx.config.learnersDir, ctx.config.learner);
  return { ...ctx, profile, store, state: store.load() };
}

const rel = (ctx: Ctx, p: string) => relative(ctx.config.root, p) || '.';

function exerciseLine(ctx: LearnerCtx, ex: Exercise): string {
  const st = ctx.state.exercises[ex.key];
  const mark = st?.status === 'passed' ? '✓' : st?.status === 'assisted' ? '~' : st ? '…' : ' ';
  return `   [${mark}] ${ex.key.padEnd(42)} ${ex.kind.padEnd(6)} ${ex.difficulty.padEnd(6)} ${String(ex.minutes).padStart(3)} min`;
}

// ---------------------------------------------------------------- commands

function cmdInit(ctx: Ctx): void {
  const { learner, learnersDir } = ctx.config;
  if (!learner) throw new UsageError('Set `learner:` in dojo.config.yaml first (or run /dojo-setup).');
  const profileFile = join(learnersDir, learner, 'profile.yaml');
  if (!existsSync(profileFile)) {
    mkdirSync(dirname(profileFile), { recursive: true });
    copyFileSync(join(learnersDir, '_template', 'profile.yaml'), profileFile);
    ctx.out(`Created ${rel(ctx, profileFile)} from the template. Fill it in, then run ./dojo today.`);
  }
  const store = new LearnerStore(learnersDir, learner);
  if (!store.exists()) {
    store.save(store.load());
    ctx.out(`Created ${rel(ctx, store.file)}.`);
  } else {
    ctx.out(`${rel(ctx, store.file)} already exists.`);
  }
}

function cmdContext(ctx: LearnerCtx): void {
  const { profile, state, catalog, now } = ctx;
  const due = dueCards(state, now);
  const resolves = due.filter((c) => c.id.startsWith(RESOLVE_PREFIX)).length;
  ctx.out(`# Dojo context: ${profile.name} (${profile.id})`);
  if (profile.headline) ctx.out(profile.headline);
  ctx.out();
  if (profile.summary) ctx.out(`Background: ${profile.summary}\n`);
  if (profile.goals.length) ctx.out(`Learning goals:\n${profile.goals.map((g) => `- ${g}`).join('\n')}\n`);
  if (profile.strengths.length) ctx.out(`Strengths to build on: ${profile.strengths.join('; ')}\n`);
  if (profile.tutorNotes) ctx.out(`Tutor notes: ${profile.tutorNotes}\n`);
  const weights = Object.entries(profile.trackWeights)
    .sort((a, b) => b[1] - a[1])
    .map(([t, w]) => `${t} ${pct(w)}`)
    .join(', ');
  ctx.out(`Track focus: ${weights || 'none set'}`);
  ctx.out(`Exercise language: ${profile.exerciseLanguage}`);
  ctx.out(`Schedule: ${profile.weekdayMinutes} min weekdays, ${profile.weekendMinutes} min weekends`);
  const iv = profile.interview;
  ctx.out(`Interviewing: ${iv.active ? `yes${iv.targetDate ? `, target ${iv.targetDate}` : ''}${iv.targetRoles.length ? ` (${iv.targetRoles.join(', ')})` : ''}` : 'not right now'}`);
  ctx.out(`Due now: ${due.length - resolves} review card(s), ${resolves} re-solve(s)`);

  const inProgress = Object.entries(state.exercises).filter(([, e]) => e.status === 'in-progress');
  if (inProgress.length) {
    ctx.out('\nIn progress:');
    for (const [key, e] of inProgress) {
      const t = e.lastTest ? `, last test ${e.lastTest.passed}/${e.lastTest.total}` : '';
      ctx.out(`- ${key} (started ${day(e.startedAt)}${t})`);
    }
  }

  const rated = Object.entries(state.skills).map(([id, s]) => ({ id, m: masteryOf(s.rating), title: catalog.skills.get(id)?.title ?? id }));
  if (rated.length) {
    rated.sort((a, b) => a.m - b.m);
    ctx.out('\nWeakest rated skills:');
    for (const s of rated.slice(0, 5)) ctx.out(`- ${s.title} (${s.id}) ${pct(s.m)}`);
    ctx.out('Strongest rated skills:');
    for (const s of rated.slice(-3).reverse()) ctx.out(`- ${s.title} (${s.id}) ${pct(s.m)}`);
  } else {
    ctx.out('\nNo skills rated yet. Suggest /placement before the first lesson.');
  }

  const open = state.notes.filter((n) => !n.resolvedAt);
  if (open.length) {
    ctx.out('\nOpen misconceptions and notes:');
    for (const n of open.slice(-10)) ctx.out(`- [${n.id}]${n.skill ? ` (${n.skill})` : ''} ${n.text}`);
  }
  if (state.sessions.length) {
    ctx.out('\nRecent sessions:');
    for (const s of state.sessions.slice(-3)) {
      ctx.out(`- ${day(s.at)} ${s.mode}${s.module ? ` ${s.module}` : s.track ? ` ${s.track}` : ''}, ${s.minutes} min${s.notes ? `: ${s.notes}` : ''}`);
    }
  }
}

function cmdToday(ctx: LearnerCtx, flags: Flags): void {
  const minutes = num(flags.minutes, 'minutes', { min: 5 });
  const plan = planToday(ctx.catalog, ctx.profile, ctx.state, minutes === undefined ? { now: ctx.now } : { now: ctx.now, minutes });
  if (flags.json) {
    ctx.out(JSON.stringify({ ...plan, candidates: plan.candidates.slice(0, 5).map((c) => ({ exercise: c.exercise.key, priority: c.priority, mastery: c.mastery, reason: c.reason })) }, null, 2));
    return;
  }
  ctx.out(`Today, ${plan.date}: ${plan.minutesPlanned} of ${plan.minutesAvailable} minutes planned\n`);
  plan.items.forEach((item, i) => {
    ctx.out(`${i + 1}. ${item.title}  [${item.minutes} min]`);
    if (item.ref) ctx.out(`   ref: ${item.ref}`);
    ctx.out(`   why: ${item.reason}`);
  });
  const alternatives = plan.candidates.filter((c) => !plan.items.some((i) => i.ref === c.exercise.key)).slice(0, 3);
  if (alternatives.length) {
    ctx.out('\nAlso good next:');
    for (const c of alternatives) ctx.out(`- ${c.exercise.key}: ${c.reason}`);
  }
}

function cmdModules(ctx: LearnerCtx, flags: Flags): void {
  for (const track of ctx.catalog.tracks) {
    if (flags.track && track.id !== flags.track) continue;
    const w = ctx.profile.trackWeights[track.id] ?? 0;
    ctx.out(`\n${track.title} (${track.id})${w ? `, focus ${pct(w)}` : ''}`);
    for (const mod of track.modules) {
      const done = mod.exercises.filter((e) => isDone(ctx.state, e)).length;
      ctx.out(` ${moduleComplete(ctx.state, mod) ? '✓' : '•'} ${mod.id.padEnd(26)} ${bar(moduleMastery(ctx.state, mod))}  ${done}/${mod.exercises.length} done  ${mod.title}`);
      for (const ex of mod.exercises) ctx.out(exerciseLine(ctx, ex));
    }
    for (const p of track.planned) ctx.out(` ○ ${p.id.padEnd(26)} planned: ${p.title}`);
  }
  ctx.out('\nLegend: ✓ done  ~ done with heavy hints  … in progress  ○ planned (ask the tutor to author it)');
}

function cmdShow(ctx: LearnerCtx, ref: string): void {
  let mod: Module | undefined;
  try {
    mod = findModule(ctx.catalog, ref);
  } catch {
    mod = undefined;
  }
  if (mod) {
    ctx.out(`${mod.title} (${mod.trackId}/${mod.id}), ${mod.level}, about ${mod.minutes} min`);
    ctx.out(mod.summary);
    ctx.out(`\nBrief:  ${rel(ctx, join(mod.dir, 'brief.md'))}`);
    if (mod.prerequisites.length) ctx.out(`Prerequisites: ${mod.prerequisites.join(', ')}`);
    ctx.out('\nObjectives:');
    for (const o of mod.objectives) ctx.out(`- ${o}`);
    ctx.out('\nSkills:');
    for (const s of mod.skills) ctx.out(`- ${s.id}: ${s.title}  ${bar(skillMastery(ctx.state, s.id))}`);
    ctx.out('\nExercises:');
    for (const ex of mod.exercises) ctx.out(exerciseLine(ctx, ex));
    if (mod.links.length) {
      ctx.out('\nFurther practice:');
      for (const l of mod.links) ctx.out(`- ${l.title}: ${l.url}`);
    }
    return;
  }
  const ex = findExercise(ctx.catalog, ref);
  const st = ctx.state.exercises[ex.key];
  ctx.out(`${ex.title} (${ex.key}), ${ex.kind}, ${ex.difficulty}, target ${ex.minutes} min`);
  ctx.out(`Skills: ${ex.skills.join(', ')}`);
  ctx.out(`Status: ${st ? `${st.status}, ${st.attempts} attempt(s), best score ${pct(st.bestScore)}` : 'not started'}`);
  ctx.out(`\nPrompt:     ${rel(ctx, join(ex.dir, 'README.md'))}`);
  ctx.out(`Workspace:  ${rel(ctx, ctx.store.solutionPath(ex))}${existsSync(ctx.store.solutionPath(ex)) ? '' : ' (run ./dojo start first)'}`);
  if (ex.kind === 'code') {
    ctx.out(`Tests:      ${testFiles(ex).map((f) => rel(ctx, f)).join(', ')}`);
    ctx.out(`Reference:  ${rel(ctx, join(ex.dir, 'reference.ts'))}  (tutor only; never show before hint rung 5)`);
  } else {
    ctx.out(`Rubric:     ${rel(ctx, join(ex.dir, 'rubric.yaml'))}`);
  }
}

function cmdStart(ctx: LearnerCtx, ref: string, flags: Flags): void {
  const ex = findExercise(ctx.catalog, ref);
  const dest = ctx.store.solutionPath(ex);
  const starter = join(ex.dir, ex.kind === 'code' ? 'starter.ts' : 'starter.md');
  if (!existsSync(dest) || flags.reset) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(starter, dest);
    ctx.out(`${flags.reset ? 'Reset' : 'Created'} ${rel(ctx, dest)}`);
  } else {
    ctx.out(`Keeping your existing ${rel(ctx, dest)} (use --reset to start over)`);
  }
  const { enrolled } = startExercise(ctx.state, ctx.catalog, ex, ctx.now);
  ctx.store.save(ctx.state);
  ctx.out(`Prompt: ${rel(ctx, join(ex.dir, 'README.md'))}`);
  if (enrolled) ctx.out(`Queued ${enrolled} review card(s) from ${ex.moduleId}, first due tomorrow.`);
  ctx.out(ex.kind === 'code' ? `Run the tests with: ./dojo test ${ex.key}` : `Write your design in the workspace file, then ask the tutor to grade it against the rubric.`);
}

async function cmdTest(ctx: LearnerCtx, ref: string, flags: Flags): Promise<number> {
  const ex = findExercise(ctx.catalog, ref);
  if (ex.kind !== 'code') throw new UsageError(`${ex.key} is a design exercise: the tutor grades it with ${rel(ctx, join(ex.dir, 'rubric.yaml'))}.`);
  const solutionPath = flags.solution ?? (flags.reference ? join(ex.dir, 'reference.ts') : ctx.store.solutionPath(ex));
  if (!existsSync(solutionPath)) throw new UsageError(`No solution at ${rel(ctx, solutionPath)}. Run ./dojo start ${ex.key} first.`);
  const sandbox = (flags.sandbox ?? ctx.config.sandbox) as SandboxMode;
  const opts = {
    exercise: ex,
    solutionPath,
    sandbox,
    timeoutMs: ctx.config.testTimeoutMs,
    dockerImage: ctx.config.dockerImage,
    ...(ctx.config.dockerRuntime ? { dockerRuntime: ctx.config.dockerRuntime } : {}),
  };
  if (flags['dry-run']) {
    ctx.out(`docker ${dockerArgs(opts, testFiles(ex)).join(' ')}`);
    return 0;
  }
  const result = await runExerciseTests(opts);
  const own = !flags.solution && !flags.reference;
  if (own && ctx.state.exercises[ex.key]) {
    ctx.state.exercises[ex.key] = {
      ...ctx.state.exercises[ex.key]!,
      lastTest: { at: ctx.now.toISOString(), passed: result.passed, failed: result.failed, total: result.total, timedOut: result.timedOut, sandbox: result.sandbox },
    };
    ctx.store.save(ctx.state);
  }
  if (flags.json) {
    ctx.out(JSON.stringify(result, null, 2));
  } else {
    ctx.out(`${ex.key}: ${result.passed}/${result.total} passed in ${(result.durationMs / 1000).toFixed(1)}s (${result.sandbox} sandbox)`);
    for (const c of result.cases) {
      ctx.out(`  ${c.ok ? '✓' : '✗'} ${c.name}`);
      if (!c.ok && c.error) ctx.out(`      ${c.error.trim().split('\n').slice(0, 6).join('\n      ')}`);
    }
    if (result.output.trim()) ctx.out(`\nOutput from your code:\n${result.output.trimEnd()}`);
    if (result.passed === result.total && result.total > 0 && own) {
      ctx.out(`\nAll green. Record it with: ./dojo attempt ${ex.key} --hints <highest rung used> --minutes <time taken>`);
    }
  }
  return result.failed === 0 && result.total > 0 ? 0 : 1;
}

function cmdAttempt(ctx: LearnerCtx, ref: string, flags: Flags): void {
  const ex = findExercise(ctx.catalog, ref);
  const hints = num(flags.hints, 'hints', { min: 0, max: 5 });
  const minutes = num(flags.minutes, 'minutes', { min: 0 });
  if (hints === undefined || minutes === undefined) throw new UsageError('usage: ./dojo attempt <exercise> --hints 0-5 --minutes N [--score 0-1] [--give-up] [--notes "..."]');
  const score = num(flags.score, 'score', { min: 0, max: 1 });
  if (!ctx.state.exercises[ex.key]) startExercise(ctx.state, ctx.catalog, ex, ctx.now);
  const res = recordAttempt(
    ctx.state,
    ex,
    {
      hints,
      minutes,
      ...(score !== undefined ? { score } : {}),
      ...(flags['give-up'] ? { giveUp: true } : {}),
      ...(flags.notes ? { notes: flags.notes } : {}),
    },
    ctx.now,
  );
  ctx.store.save(ctx.state);
  ctx.out(`Recorded ${ex.key}: score ${pct(res.score)}, ${res.outcome}`);
  for (const c of res.changes) ctx.out(`  ${c.skill}: ${pct(c.before)} → ${pct(c.after)}`);
  if (res.resolveScheduled) ctx.out('  Scheduled a re-solve from a blank file in 3 days.');
}

function cardText(ctx: LearnerCtx, id: string): { front: string; back: string; label: string } {
  if (id.startsWith(RESOLVE_PREFIX)) {
    const key = id.slice(RESOLVE_PREFIX.length);
    const ex = ctx.catalog.exercises.get(key);
    return {
      label: 're-solve',
      front: `Re-solve "${ex?.title ?? key}" from a blank file: ./dojo start ${key} --reset`,
      back: `Pass the tests without hints past rung 2, then grade this card: good if clean, hard if it was a struggle, again if you needed hints.`,
    };
  }
  if (id.startsWith(CUSTOM_PREFIX)) {
    const c = ctx.state.customCards[id];
    return { label: 'your card', front: c?.front ?? '(missing)', back: c?.back ?? '(missing)' };
  }
  const c = ctx.catalog.cards.get(id);
  return { label: c ? `${c.kind}, ${c.skill}` : 'retired card', front: c?.front ?? '(this card was removed from the content)', back: c?.back ?? '' };
}

function cmdReview(ctx: LearnerCtx, args: string[], flags: Flags): void {
  const sub = args[0] ?? 'due';
  if (sub === 'due') {
    const limit = num(flags.limit, 'limit', { min: 1 }) ?? 20;
    const due = dueCards(ctx.state, ctx.now).slice(0, limit);
    if (flags.json) {
      ctx.out(JSON.stringify(due.map((c) => ({ id: c.id, ...cardText(ctx, c.id), back: undefined })), null, 2));
      return;
    }
    if (due.length === 0) {
      const next = Object.values(ctx.state.cards).map((c) => c.fsrs.due).sort()[0];
      ctx.out(`Nothing due.${next ? ` Next card due ${day(next)}.` : ' Start a lesson to queue cards.'}`);
      return;
    }
    ctx.out(`${due.length} due:`);
    for (const c of due) {
      const t = cardText(ctx, c.id);
      ctx.out(`\n[${c.id}] (${t.label})\n${t.front}`);
    }
    return;
  }
  if (sub === 'show') {
    const id = requireArg(args[1], 'review show <card>');
    const t = cardText(ctx, id);
    ctx.out(`[${id}] (${t.label})\nQ: ${t.front}\nA: ${t.back}`);
    return;
  }
  if (sub === 'grade') {
    const id = requireArg(args[1], 'review grade <card> <again|hard|good|easy>');
    const grade = requireArg(args[2], 'review grade <card> <again|hard|good|easy>');
    if (!isGradeName(grade)) throw new UsageError('grade must be again, hard, good or easy');
    const { due, intervalDays } = gradeCard(ctx.state, id, grade, ctx.now);
    ctx.store.save(ctx.state);
    const when = intervalDays < 1 ? `in ${Math.max(1, Math.round(intervalDays * 24 * 60))} min` : `on ${day(due.toISOString())} (${Math.round(intervalDays)} days)`;
    ctx.out(`${id}: ${grade}. Next review ${when}.`);
    return;
  }
  if (sub === 'add') {
    const front = requireArg(flags.front, 'review add --front "..." --back "..." [--skill id]');
    const back = requireArg(flags.back, 'review add --front "..." --back "..." [--skill id]');
    const id = `${CUSTOM_PREFIX}${Object.keys(ctx.state.customCards).length + 1}`;
    ctx.state.customCards[id] = { id, front, back, createdAt: ctx.now.toISOString(), ...(flags.skill ? { skill: flags.skill } : {}) };
    enrollCard(ctx.state, id, ctx.now, new Date(ctx.now.getTime() + 86_400_000));
    ctx.store.save(ctx.state);
    ctx.out(`Saved ${id}, first review tomorrow.`);
    return;
  }
  throw new UsageError(`unknown review command "${sub}"`);
}

function cmdSkills(ctx: LearnerCtx, flags: Flags): void {
  for (const track of ctx.catalog.tracks) {
    if (flags.track && track.id !== flags.track) continue;
    if (track.modules.length === 0) continue;
    ctx.out(`\n${track.title}`);
    for (const mod of track.modules) {
      for (const s of mod.skills) {
        const st = ctx.state.skills[s.id];
        const note = st ? `${st.attempts} attempt(s), from ${st.source}` : 'not rated yet';
        ctx.out(`  ${s.id.padEnd(36)} ${bar(skillMastery(ctx.state, s.id))}  ${note}`);
      }
    }
  }
}

function cmdPlacement(ctx: LearnerCtx, args: string[]): void {
  const skill = requireArg(args[0], 'placement <skill> <0-1>');
  const level = num(requireArg(args[1], 'placement <skill> <0-1>'), 'level', { min: 0, max: 1 }) ?? 0;
  if (!ctx.catalog.skills.has(skill)) throw new UsageError(`unknown skill "${skill}". See ./dojo skills`);
  setSkillMastery(ctx.state, skill, level, 'placement', ctx.now);
  ctx.store.save(ctx.state);
  ctx.out(`${skill} set to ${pct(skillMastery(ctx.state, skill))}`);
}

function cmdLog(ctx: LearnerCtx, flags: Flags): void {
  const mode = requireArg(flags.mode, 'log --mode <lesson|review|mock|free-play|placement|debrief> --minutes N [--track id] [--module id] [--notes "..."]');
  const minutes = num(flags.minutes, 'minutes', { min: 0 }) ?? 0;
  const track = flags.track ?? (flags.module ? ctx.catalog.modules.get(flags.module)?.trackId : undefined);
  ctx.state.sessions.push({
    at: ctx.now.toISOString(),
    mode,
    minutes,
    ...(track ? { track } : {}),
    ...(flags.module ? { module: flags.module } : {}),
    ...(flags.notes ? { notes: flags.notes } : {}),
  });
  ctx.store.save(ctx.state);
  ctx.out(`Logged a ${minutes}-minute ${mode} session.`);
}

function cmdNote(ctx: LearnerCtx, args: string[], flags: Flags): void {
  const sub = args[0] ?? 'list';
  if (sub === 'add') {
    const text = requireArg(args.slice(1).join(' '), 'note add "text" [--skill id]');
    const id = (ctx.state.notes.at(-1)?.id ?? 0) + 1;
    ctx.state.notes.push({ id, at: ctx.now.toISOString(), text, ...(flags.skill ? { skill: flags.skill } : {}) });
    ctx.store.save(ctx.state);
    ctx.out(`Note ${id} saved.`);
  } else if (sub === 'resolve') {
    const id = Number(requireArg(args[1], 'note resolve <id>'));
    const note = ctx.state.notes.find((n) => n.id === id);
    if (!note) throw new UsageError(`no note ${id}`);
    note.resolvedAt = ctx.now.toISOString();
    ctx.store.save(ctx.state);
    ctx.out(`Note ${id} resolved.`);
  } else if (sub === 'list') {
    const notes = ctx.state.notes;
    if (!notes.length) ctx.out('No notes yet.');
    for (const n of notes) ctx.out(`[${n.id}] ${n.resolvedAt ? '(resolved) ' : ''}${n.skill ? `(${n.skill}) ` : ''}${n.text}`);
  } else {
    throw new UsageError(`unknown note command "${sub}"`);
  }
}

function cmdScorecard(ctx: LearnerCtx, args: string[]): void {
  const sub = args[0] ?? 'list';
  if (sub === 'list') {
    if (!ctx.state.scorecards.length) ctx.out('No scorecards yet. Run /mock.');
    for (const s of ctx.state.scorecards) ctx.out(`${day(s.at)} ${s.round.padEnd(20)} avg ${s.average.toFixed(2)}/4  ${s.signal ?? ''}  ${s.file}`);
    return;
  }
  if (sub !== 'add') throw new UsageError(`unknown scorecard command "${sub}"`);
  const file = requireArg(args[1], 'scorecard add <file.yaml>');
  const data = (YAML.parse(readFileSync(file, 'utf8')) ?? {}) as { round?: string; scores?: Record<string, number>; signal?: string; skills?: Record<string, number> };
  const scores = Object.values(data.scores ?? {}).map(Number).filter((n) => n >= 1 && n <= 4);
  if (!data.round || scores.length === 0) throw new UsageError('a scorecard needs `round:` and `scores:` with 1-4 values');
  const dir = ctx.store.scorecardsDir();
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, `${day(ctx.now.toISOString())}-${data.round}${dirname(file) === dir ? '' : `-${Date.now() % 100000}`}.yaml`);
  if (dirname(file) !== dir) writeFileSync(dest, readFileSync(file));
  const stored = dirname(file) === dir ? file : dest;
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  ctx.state.scorecards.push({ at: ctx.now.toISOString(), round: data.round, file: relative(ctx.store.dir, stored), average, ...(data.signal ? { signal: data.signal } : {}) });
  const changes: string[] = [];
  for (const [skill, value] of Object.entries(data.skills ?? {})) {
    if (!ctx.catalog.skills.has(skill)) {
      changes.push(`  skipped unknown skill ${skill}`);
      continue;
    }
    const score = Math.min(4, Math.max(1, Number(value))) / 4;
    const c = applySkillScore(ctx.state, skill, score, 'medium', 'scorecard', ctx.now);
    changes.push(`  ${skill}: ${pct(c.before)} → ${pct(c.after)}`);
  }
  ctx.store.save(ctx.state);
  ctx.out(`Saved scorecard ${basename(stored)}: average ${average.toFixed(2)}/4${data.signal ? `, ${data.signal}` : ''}.`);
  for (const line of changes) ctx.out(line);
}

async function cmdValidate(ctx: Ctx, flags: Flags): Promise<number> {
  const errors = structuralIssues(ctx.catalog);
  let checked = 0;
  if (flags.solutions) {
    const res = await solutionIssues(ctx.catalog, ctx.config);
    errors.push(...res.errors);
    checked = res.checked;
  }
  const modules = ctx.catalog.modules.size;
  const exercises = ctx.catalog.exercises.size;
  if (errors.length) {
    ctx.out(`${errors.length} problem(s):`);
    for (const e of errors) ctx.out(`- ${e}`);
    return 1;
  }
  ctx.out(`Content OK: ${modules} modules, ${exercises} exercises, ${ctx.catalog.cards.size} cards${flags.solutions ? `; ${checked} reference solutions pass and every starter fails` : ''}.`);
  return 0;
}

// ---------------------------------------------------------------- entry

export async function main(argv: string[], out: (s?: string) => void = (s = '') => console.log(s)): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
  } catch (err) {
    out(`${(err as Error).message}\n\n${HELP}`);
    return 2;
  }
  const { values: flags, positionals } = parsed;
  const [command, ...args] = positionals;
  if (!command || flags.help || command === 'help') {
    out(HELP);
    return 0;
  }
  const config = loadConfig();
  const now = process.env.DOJO_NOW ? new Date(process.env.DOJO_NOW) : new Date();
  const ctx: Ctx = { config, catalog: loadCatalog(config.contentDir), now, out };

  try {
    switch (command) {
      case 'init':
        cmdInit(ctx);
        return 0;
      case 'validate':
        return await cmdValidate(ctx, flags);
    }
    const lctx = withLearner(ctx);
    switch (command) {
      case 'context':
        cmdContext(lctx);
        return 0;
      case 'today':
        cmdToday(lctx, flags);
        return 0;
      case 'modules':
      case 'tracks':
        cmdModules(lctx, flags);
        return 0;
      case 'show':
        cmdShow(lctx, requireArg(args[0], 'show <module|exercise>'));
        return 0;
      case 'start':
        cmdStart(lctx, requireArg(args[0], 'start <exercise> [--reset]'), flags);
        return 0;
      case 'test':
        return await cmdTest(lctx, requireArg(args[0], 'test <exercise>'), flags);
      case 'attempt':
        cmdAttempt(lctx, requireArg(args[0], 'attempt <exercise> --hints N --minutes N'), flags);
        return 0;
      case 'review':
        cmdReview(lctx, args, flags);
        return 0;
      case 'skills':
        cmdSkills(lctx, flags);
        return 0;
      case 'placement':
        cmdPlacement(lctx, args);
        return 0;
      case 'log':
        cmdLog(lctx, flags);
        return 0;
      case 'note':
        cmdNote(lctx, args, flags);
        return 0;
      case 'scorecard':
        cmdScorecard(lctx, args);
        return 0;
      default:
        out(`Unknown command "${command}".\n\n${HELP}`);
        return 2;
    }
  } catch (err) {
    out(`error: ${(err as Error).message}`);
    return err instanceof UsageError ? 2 : 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
