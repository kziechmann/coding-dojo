import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  attemptScore,
  DIFFICULTY_RATING,
  expectedScore,
  INITIAL_RATING,
  kFactor,
  masteryOf,
  ratingForMastery,
  updateRating,
} from '../src/learner/mastery.ts';

test('expected score is 0.5 at equal rating and rises with rating', () => {
  assert.equal(expectedScore(1100, 1100), 0.5);
  assert.ok(expectedScore(1300, 1100) > 0.7);
  assert.ok(expectedScore(900, 1100) < 0.3);
});

test('attempt score combines pass ratio, hint discount and time', () => {
  assert.equal(attemptScore({ passed: 10, total: 10, hints: 0, minutes: 20, targetMinutes: 25 }), 1);
  assert.equal(attemptScore({ passed: 5, total: 10, hints: 0, minutes: 10, targetMinutes: 25 }), 0.5);
  assert.equal(attemptScore({ passed: 10, total: 10, hints: 2, minutes: 10, targetMinutes: 25 }), 0.7);
  assert.equal(attemptScore({ passed: 10, total: 10, hints: 5, minutes: 10, targetMinutes: 25 }), 0.1);
  assert.ok(Math.abs(attemptScore({ passed: 10, total: 10, hints: 0, minutes: 50, targetMinutes: 25 }) - 0.7) < 1e-9);
  assert.equal(attemptScore({ passed: 0, total: 0, hints: 0, minutes: 1, targetMinutes: 25 }), 0);
});

test('ratings move toward the evidence, faster for the first attempts', () => {
  const up = updateRating(INITIAL_RATING, 0, 'medium', 1);
  const down = updateRating(INITIAL_RATING, 0, 'medium', 0);
  assert.ok(up > INITIAL_RATING && down < INITIAL_RATING);
  assert.equal(kFactor(0), 64);
  assert.equal(kFactor(5), 32);
  assert.ok(updateRating(INITIAL_RATING, 10, 'medium', 1) - INITIAL_RATING < up - INITIAL_RATING);
});

test('solving a hard problem moves the rating more than an easy one', () => {
  const easy = updateRating(1100, 5, 'easy', 1) - 1100;
  const hard = updateRating(1100, 5, 'hard', 1) - 1100;
  assert.ok(hard > easy);
  assert.equal(DIFFICULTY_RATING.medium, 1100);
});

test('ratingForMastery inverts masteryOf', () => {
  for (const m of [0.15, 0.35, 0.5, 0.75]) assert.ok(Math.abs(masteryOf(ratingForMastery(m)) - m) < 1e-9);
});
