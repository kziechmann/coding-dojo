import type { Catalog, Exercise, Module } from '../content/types.ts';
import type { Profile } from '../learner/profile.ts';
import { isDone, moduleComplete, moduleMastery, moduleStarted } from '../learner/progress.ts';
import { dueCards, RESOLVE_PREFIX } from '../learner/review.ts';
import type { LearnerState } from '../learner/types.ts';

export interface Candidate {
  exercise: Exercise;
  module: Module;
  priority: number;
  mastery: number;
  reason: string;
}

export type PlanItemKind = 'review' | 'resolve' | 'lesson' | 'exercise' | 'reflect';

export interface PlanItem {
  kind: PlanItemKind;
  minutes: number;
  title: string;
  ref?: string;
  reason: string;
}

export interface Plan {
  date: string;
  minutesAvailable: number;
  minutesPlanned: number;
  dueReviews: number;
  items: PlanItem[];
  candidates: Candidate[];
}

/** Tracks whose weight goes up as an interview date gets close. */
const INTERVIEW_TRACKS = new Set(['dsa', 'system-design', 'interview-readiness']);
const BRIEF_MINUTES = 10;
const REFLECT_MINUTES = 5;
const MAX_EXERCISES = 2;

const pct = (n: number) => `${Math.round(n * 100)}%`;

function daysUntil(dateIso: string, now: Date): number {
  return (new Date(`${dateIso}T00:00:00`).getTime() - now.getTime()) / 86_400_000;
}

function nextExercise(state: LearnerState, mod: Module): Exercise | undefined {
  const open = mod.exercises.filter((e) => !isDone(state, e));
  return open.find((e) => state.exercises[e.key]) ?? open[0];
}

export function rankCandidates(catalog: Catalog, profile: Profile, state: LearnerState, now: Date): Candidate[] {
  const recentTracks = state.sessions.slice(-2).map((s) => s.track);
  const candidates: Candidate[] = [];

  for (const track of catalog.tracks) {
    const weight = profile.trackWeights[track.id] ?? 0;
    if (weight <= 0) continue;
    const tired = recentTracks.length === 2 && recentTracks.every((t) => t === track.id);
    const unfinished = track.modules.filter((m) => !moduleComplete(state, m));

    unfinished.forEach((mod, index) => {
      const exercise = nextExercise(state, mod);
      if (!exercise) return;
      const mastery = moduleMastery(state, mod);
      const prereqsMissing = mod.prerequisites.filter((p) => {
        const pm = catalog.modules.get(p);
        return pm !== undefined && !moduleComplete(state, pm) && moduleMastery(state, pm) < 0.5;
      });
      const iw =
        exercise.skills.reduce((s, id) => s + (catalog.skills.get(id)?.interviewWeight ?? 0.5), 0) / Math.max(1, exercise.skills.length);

      let interviewFactor = 0.8 + 0.2 * iw;
      if (profile.interview.active) {
        const urgency =
          profile.interview.targetDate && INTERVIEW_TRACKS.has(track.id)
            ? 1 + Math.min(1, Math.max(0, (60 - daysUntil(profile.interview.targetDate, now)) / 60))
            : 1;
        interviewFactor = (0.4 + 0.6 * iw) * urgency;
      }
      const started = state.exercises[exercise.key] !== undefined;
      const priority =
        weight *
        interviewFactor *
        Math.max(0.05, 1 - mastery) *
        (prereqsMissing.length ? 0.3 : 1) *
        (started ? 1.5 : 1) *
        (tired ? 0.6 : 1) *
        (1 / (1 + 0.15 * index));

      const why = [`${track.title} is ${pct(weight)} of your focus`, `${mod.title} mastery ${pct(mastery)}`];
      if (started) why.push('already started');
      if (prereqsMissing.length) why.push(`do ${prereqsMissing.join(', ')} first`);
      if (tired) why.push('two sessions in a row on this track, so ranked lower');
      candidates.push({ exercise, module: mod, priority, mastery, reason: why.join('; ') });
    });
  }
  return candidates.sort((a, b) => b.priority - a.priority);
}

export function planToday(
  catalog: Catalog,
  profile: Profile,
  state: LearnerState,
  opts: { now: Date; minutes?: number },
): Plan {
  const { now } = opts;
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  const available = opts.minutes ?? (weekend ? profile.weekendMinutes : profile.weekdayMinutes);
  const items: PlanItem[] = [];
  let used = 0;

  const due = dueCards(state, now);
  const resolves = due.filter((c) => c.id.startsWith(RESOLVE_PREFIX));
  const reviews = due.length - resolves.length;
  if (reviews > 0) {
    const minutes = Math.min(15, Math.max(5, Math.ceil(reviews * 0.75)));
    items.push({ kind: 'review', minutes, title: `Review ${reviews} due card${reviews === 1 ? '' : 's'}`, reason: 'Due reviews always come first.' });
    used += minutes;
  }

  const reflect = available >= 30 ? REFLECT_MINUTES : 0;
  const firstResolve = resolves[0];
  if (firstResolve) {
    const ex = catalog.exercises.get(firstResolve.id.slice(RESOLVE_PREFIX.length));
    if (ex && used + ex.minutes + reflect <= available) {
      items.push({
        kind: 'resolve',
        minutes: ex.minutes,
        title: `Re-solve ${ex.title} from a blank file`,
        ref: ex.key,
        reason: 'You finished this with heavy hints; solving it cold is how it sticks.',
      });
      used += ex.minutes;
    }
  }

  const candidates = rankCandidates(catalog, profile, state, now);
  const chosenModules = new Set<string>();
  let exercises = 0;
  for (const c of candidates) {
    if (exercises >= MAX_EXERCISES) break;
    if (chosenModules.has(c.module.id)) continue;
    const isNew = !moduleStarted(state, c.module);
    const minutes = c.exercise.minutes + (isNew ? BRIEF_MINUTES : 0);
    const remaining = available - used - reflect;
    const fits = minutes <= remaining || (exercises === 0 && remaining >= minutes * 0.6);
    if (!fits) continue;
    items.push({
      kind: isNew ? 'lesson' : 'exercise',
      minutes,
      title: isNew ? `Lesson: ${c.module.title}, then "${c.exercise.title}"` : `${c.exercise.title} (${c.module.title})`,
      ref: c.exercise.key,
      reason: c.reason,
    });
    used += minutes;
    chosenModules.add(c.module.id);
    exercises++;
  }

  if (reflect) {
    items.push({ kind: 'reflect', minutes: reflect, title: 'Reflect: what was hard, what to remember', reason: 'The tutor turns this into notes and cards.' });
    used += reflect;
  }

  return {
    date: now.toISOString().slice(0, 10),
    minutesAvailable: available,
    minutesPlanned: used,
    dueReviews: reviews,
    items,
    candidates,
  };
}
