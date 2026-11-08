import type { Catalog, Difficulty, Exercise, Module } from '../content/types.ts';
import { attemptScore, INITIAL_RATING, masteryOf, MAX_HINT_RUNG, ratingForMastery, updateRating } from './mastery.ts';
import { enrollCard, RESOLVE_PREFIX } from './review.ts';
import type { ExerciseStatus, LearnerState, SkillSource } from './types.ts';

const DAY_MS = 86_400_000;

export function skillRating(state: LearnerState, skillId: string): number {
  return state.skills[skillId]?.rating ?? INITIAL_RATING;
}

export function skillMastery(state: LearnerState, skillId: string): number {
  return masteryOf(skillRating(state, skillId));
}

export function moduleMastery(state: LearnerState, mod: Module): number {
  if (mod.skills.length === 0) return 0;
  return mod.skills.reduce((sum, s) => sum + skillMastery(state, s.id), 0) / mod.skills.length;
}

export function isDone(state: LearnerState, exercise: Exercise): boolean {
  const status = state.exercises[exercise.key]?.status;
  return status === 'passed' || status === 'assisted';
}

export function moduleComplete(state: LearnerState, mod: Module): boolean {
  return mod.exercises.length > 0 && mod.exercises.every((e) => isDone(state, e));
}

export function moduleStarted(state: LearnerState, mod: Module): boolean {
  return mod.exercises.some((e) => state.exercises[e.key] !== undefined);
}

export function setSkillMastery(state: LearnerState, skillId: string, mastery: number, source: SkillSource, now: Date): void {
  const prev = state.skills[skillId];
  state.skills[skillId] = {
    rating: ratingForMastery(mastery),
    attempts: prev?.attempts ?? 0,
    updatedAt: now.toISOString(),
    source,
  };
}

/**
 * Mark an exercise as started and queue its module's review cards.
 * Cards come due the next day: the lesson already ends with a recall check,
 * and a first review after a night's sleep is what makes it stick.
 */
export function startExercise(state: LearnerState, catalog: Catalog, exercise: Exercise, now: Date): { enrolled: number } {
  if (!state.exercises[exercise.key]) {
    state.exercises[exercise.key] = { status: 'in-progress', startedAt: now.toISOString(), bestScore: 0, attempts: 0 };
  }
  const mod = catalog.modules.get(exercise.moduleId);
  let enrolled = 0;
  const tomorrow = new Date(now.getTime() + DAY_MS);
  for (const card of mod?.cards ?? []) if (enrollCard(state, card.id, now, tomorrow)) enrolled++;
  return { enrolled };
}

/** One Elo update for one skill. Returns mastery before and after. */
export function applySkillScore(
  state: LearnerState,
  skill: string,
  score: number,
  difficulty: Difficulty,
  source: SkillSource,
  now: Date,
): { skill: string; before: number; after: number } {
  const prev = state.skills[skill];
  const before = prev?.rating ?? INITIAL_RATING;
  const after = updateRating(before, prev?.attempts ?? 0, difficulty, score);
  state.skills[skill] = { rating: after, attempts: (prev?.attempts ?? 0) + 1, updatedAt: now.toISOString(), source };
  return { skill, before: masteryOf(before), after: masteryOf(after) };
}

export interface AttemptOptions {
  hints: number;
  minutes: number;
  /** Override the test-derived score, e.g. a rubric average / 4 for design exercises. */
  score?: number;
  passed?: number;
  total?: number;
  giveUp?: boolean;
  notes?: string;
}

export interface AttemptOutcome {
  score: number;
  outcome: ExerciseStatus;
  changes: { skill: string; before: number; after: number }[];
  resolveScheduled: boolean;
}

const STATUS_RANK: Record<ExerciseStatus, number> = { 'in-progress': 0, assisted: 1, passed: 2 };

export function recordAttempt(state: LearnerState, exercise: Exercise, opts: AttemptOptions, now: Date): AttemptOutcome {
  const ex = state.exercises[exercise.key];
  const last = ex?.lastTest;
  const passed = opts.passed ?? last?.passed;
  const total = opts.total ?? last?.total;
  if (opts.score === undefined && (passed === undefined || total === undefined)) {
    throw new Error(`No test results for ${exercise.key}. Run \`./dojo test ${exercise.key}\` first, or pass --score for a design exercise.`);
  }

  const hints = Math.min(MAX_HINT_RUNG, Math.max(0, Math.round(opts.hints)));
  const score =
    opts.score !== undefined
      ? Math.min(1, Math.max(0, opts.score))
      : attemptScore({ passed: passed ?? 0, total: total ?? 0, hints, minutes: opts.minutes, targetMinutes: exercise.minutes });

  const solved = opts.score !== undefined ? score >= 0.6 : passed === total && (total ?? 0) > 0;
  let outcome: ExerciseStatus = 'in-progress';
  if (opts.giveUp || hints >= MAX_HINT_RUNG) outcome = 'assisted';
  else if (solved) outcome = 'passed';

  const changes = exercise.skills.map((skill) => applySkillScore(state, skill, score, exercise.difficulty, 'attempt', now));

  const prevStatus = ex?.status ?? 'in-progress';
  const status = STATUS_RANK[outcome] > STATUS_RANK[prevStatus] ? outcome : prevStatus;
  state.exercises[exercise.key] = {
    status,
    startedAt: ex?.startedAt ?? now.toISOString(),
    ...(status !== 'in-progress' ? { completedAt: ex?.completedAt ?? now.toISOString() } : {}),
    bestScore: Math.max(ex?.bestScore ?? 0, score),
    attempts: (ex?.attempts ?? 0) + 1,
    ...(last ? { lastTest: last } : {}),
  };

  let resolveScheduled = false;
  if (outcome === 'assisted') {
    resolveScheduled = enrollCard(state, `${RESOLVE_PREFIX}${exercise.key}`, now, new Date(now.getTime() + 3 * DAY_MS));
  }

  state.attempts.push({
    at: now.toISOString(),
    exercise: exercise.key,
    passed: passed ?? 0,
    total: total ?? 0,
    hints,
    minutes: opts.minutes,
    score,
    outcome,
    ...(opts.notes ? { notes: opts.notes } : {}),
  });
  return { score, outcome, changes, resolveScheduled };
}
