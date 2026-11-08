import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Catalog, Exercise, Module, Track } from '../src/content/types.ts';
import { parseProfile } from '../src/learner/profile.ts';
import { recordAttempt, setSkillMastery, startExercise } from '../src/learner/progress.ts';
import { enrollCard, RESOLVE_PREFIX } from '../src/learner/review.ts';
import { emptyState } from '../src/learner/store.ts';
import { planToday, rankCandidates } from '../src/planner/today.ts';

const monday = new Date('2026-11-09T17:00:00Z');

function makeCatalog(): Catalog {
  const tracks: Track[] = [];
  const catalog: Catalog = { contentDir: '', tracks, modules: new Map(), exercises: new Map(), skills: new Map(), cards: new Map(), issues: [] };
  const add = (trackId: string, modId: string, order: number, prerequisites: string[] = []) => {
    let track = tracks.find((t) => t.id === trackId);
    if (!track) {
      track = { id: trackId, title: trackId, summary: '', planned: [], modules: [] };
      tracks.push(track);
    }
    const skillId = `${modId}.skill`;
    const ex: Exercise = { id: `${modId}-ex`, key: `${modId}/${modId}-ex`, title: `${modId} exercise`, kind: 'code', difficulty: 'medium', minutes: 20, skills: [skillId], dir: '', moduleId: modId, trackId };
    const mod: Module = {
      id: modId,
      trackId,
      order,
      title: modId,
      summary: '',
      level: 'intro',
      minutes: 30,
      prerequisites,
      objectives: [],
      skills: [{ id: skillId, title: skillId, interviewWeight: 0.5, moduleId: modId, trackId }],
      exercises: [ex],
      cards: [{ id: `${modId}/c1`, skill: skillId, kind: 'recall', front: 'q', back: 'a', moduleId: modId }],
      links: [],
      dir: '',
    };
    track.modules.push(mod);
    catalog.modules.set(modId, mod);
    catalog.exercises.set(ex.key, ex);
    catalog.skills.set(skillId, mod.skills[0]!);
    catalog.cards.set(mod.cards[0]!.id, mod.cards[0]!);
  };
  add('ai', 'ai-1', 1);
  add('ai', 'ai-2', 2, ['ai-1']);
  add('sd', 'sd-1', 1);
  add('dsa', 'dsa-1', 1);
  return catalog;
}

const profile = (tracks: Record<string, number>, extra: Record<string, unknown> = {}) =>
  parseProfile({ id: 'p', tracks, schedule: { weekday_minutes: 45, weekend_minutes: 90 }, ...extra }, 'p.yaml', 'p');

test('profile weights are normalized and zero weights dropped', () => {
  const p = profile({ ai: 3, sd: 1, dsa: 0 });
  assert.deepEqual(p.trackWeights, { ai: 0.75, sd: 0.25 });
});

test('higher track weight ranks first; unweighted tracks are ignored', () => {
  const ranked = rankCandidates(makeCatalog(), profile({ ai: 3, sd: 1 }), emptyState('p', monday), monday);
  assert.equal(ranked[0]!.module.id, 'ai-1');
  assert.ok(!ranked.some((c) => c.module.trackId === 'dsa'));
});

test('missing prerequisites push a module down', () => {
  const ranked = rankCandidates(makeCatalog(), profile({ ai: 1 }), emptyState('p', monday), monday);
  assert.deepEqual(ranked.map((c) => c.module.id), ['ai-1', 'ai-2']);
  assert.match(ranked[1]!.reason, /do ai-1 first/);
});

test('mastered skills drop in priority', () => {
  const state = emptyState('p', monday);
  setSkillMastery(state, 'ai-1.skill', 0.9, 'placement', monday);
  const ranked = rankCandidates(makeCatalog(), profile({ ai: 1, sd: 1 }), state, monday);
  assert.equal(ranked[0]!.module.id, 'sd-1');
});

test('passed exercises are not suggested again', () => {
  const catalog = makeCatalog();
  const state = emptyState('p', monday);
  const ex = catalog.exercises.get('sd-1/sd-1-ex')!;
  startExercise(state, catalog, ex, monday);
  recordAttempt(state, ex, { hints: 0, minutes: 10, passed: 5, total: 5 }, monday);
  const ranked = rankCandidates(catalog, profile({ sd: 1 }), state, monday);
  assert.equal(ranked.length, 0);
});

test('two sessions in a row on a track lowers it', () => {
  const state = emptyState('p', monday);
  state.sessions.push({ at: monday.toISOString(), mode: 'lesson', minutes: 30, track: 'ai' }, { at: monday.toISOString(), mode: 'lesson', minutes: 30, track: 'ai' });
  const ranked = rankCandidates(makeCatalog(), profile({ ai: 1.2, sd: 1 }), state, monday);
  assert.equal(ranked[0]!.module.trackId, 'sd');
});

test('the plan puts reviews first, fits the minutes and ends with reflection', () => {
  const catalog = makeCatalog();
  const state = emptyState('p', monday);
  for (let i = 0; i < 8; i++) enrollCard(state, `x/${i}`, monday);
  const plan = planToday(catalog, profile({ ai: 1, sd: 1 }), state, { now: monday });
  assert.equal(plan.minutesAvailable, 45);
  assert.equal(plan.items[0]!.kind, 'review');
  assert.equal(plan.items.at(-1)!.kind, 'reflect');
  assert.ok(plan.minutesPlanned <= 45 + 10, `planned ${plan.minutesPlanned}`);
  assert.ok(plan.items.some((i) => i.kind === 'lesson'));
});

test('weekends use the weekend budget; --minutes overrides', () => {
  const saturday = new Date('2026-11-14T17:00:00Z');
  const catalog = makeCatalog();
  assert.equal(planToday(catalog, profile({ ai: 1 }), emptyState('p', saturday), { now: saturday }).minutesAvailable, 90);
  assert.equal(planToday(catalog, profile({ ai: 1 }), emptyState('p', monday), { now: monday, minutes: 20 }).minutesAvailable, 20);
});

test('due re-solves are planned before new lessons', () => {
  const catalog = makeCatalog();
  const state = emptyState('p', monday);
  enrollCard(state, `${RESOLVE_PREFIX}sd-1/sd-1-ex`, monday);
  const plan = planToday(catalog, profile({ ai: 1, sd: 1 }), state, { now: monday });
  assert.equal(plan.items[0]!.kind, 'resolve');
  assert.equal(plan.items[0]!.ref, 'sd-1/sd-1-ex');
});

test('an assisted attempt schedules a re-solve in three days', () => {
  const catalog = makeCatalog();
  const state = emptyState('p', monday);
  const ex = catalog.exercises.get('ai-1/ai-1-ex')!;
  const res = recordAttempt(state, ex, { hints: 5, minutes: 40, passed: 3, total: 3 }, monday);
  assert.equal(res.outcome, 'assisted');
  assert.equal(res.resolveScheduled, true);
  const card = state.cards[`${RESOLVE_PREFIX}${ex.key}`]!;
  assert.equal(new Date(card.fsrs.due).getTime() - monday.getTime(), 3 * 86_400_000);
});
