import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dueCards, enrollCard, gradeCard } from '../src/learner/review.ts';
import { emptyState } from '../src/learner/store.ts';

const day = 86_400_000;
const t0 = new Date('2026-11-09T09:00:00Z');

test('enrolled cards come due and are not enrolled twice', () => {
  const state = emptyState('x', t0);
  assert.equal(enrollCard(state, 'm/a', t0), true);
  assert.equal(enrollCard(state, 'm/a', t0), false);
  enrollCard(state, 'm/b', t0, new Date(t0.getTime() + day));
  assert.deepEqual(dueCards(state, t0).map((c) => c.id), ['m/a']);
  assert.equal(dueCards(state, new Date(t0.getTime() + day)).length, 2);
});

test('good answers push the next review out further each time', () => {
  const state = emptyState('x', t0);
  enrollCard(state, 'm/a', t0);
  let now = t0;
  const intervals: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { due, intervalDays } = gradeCard(state, 'm/a', 'good', now);
    intervals.push(intervalDays);
    now = due;
  }
  for (let i = 1; i < intervals.length; i++) assert.ok(intervals[i]! > intervals[i - 1]!, `intervals ${intervals.join(', ')}`);
  assert.equal(state.cards['m/a']!.reviews, 4);
  assert.equal(state.cards['m/a']!.lastGrade, 'good');
});

test('again schedules sooner than easy', () => {
  const a = emptyState('x', t0);
  const b = emptyState('x', t0);
  enrollCard(a, 'c', t0);
  enrollCard(b, 'c', t0);
  const again = gradeCard(a, 'c', 'again', t0).intervalDays;
  const easy = gradeCard(b, 'c', 'easy', t0).intervalDays;
  assert.ok(again < easy);
});

test('state survives a JSON round trip', () => {
  const state = emptyState('x', t0);
  enrollCard(state, 'c', t0);
  gradeCard(state, 'c', 'good', t0);
  const copy = JSON.parse(JSON.stringify(state));
  const { intervalDays } = gradeCard(copy, 'c', 'good', new Date(state.cards.c!.fsrs.due));
  assert.ok(intervalDays > 0);
});

test('grading an unknown card throws', () => {
  assert.throws(() => gradeCard(emptyState('x', t0), 'nope', 'good', t0), /not in your review queue/);
});
