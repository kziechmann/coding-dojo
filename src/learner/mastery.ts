import type { Difficulty } from '../content/types.ts';

/**
 * Elo-style mastery, one rating per skill.
 *   E  = 1 / (1 + 10^((D - R) / 400))   expected score against difficulty D
 *   R' = R + K (s - E)                  s is the attempt score in [0, 1]
 * Mastery shown to the learner is E against a typical medium problem.
 */
export const INITIAL_RATING = 1000;
export const DIFFICULTY_RATING: Record<Difficulty, number> = { easy: 900, medium: 1100, hard: 1300 };

/** Score multiplier by highest hint-ladder rung used (0 = no hints, 5 = full solution shown). */
export const HINT_DISCOUNT = [1, 0.85, 0.7, 0.5, 0.3, 0.1] as const;
export const MAX_HINT_RUNG = HINT_DISCOUNT.length - 1;

export function expectedScore(rating: number, difficultyRating: number): number {
  return 1 / (1 + 10 ** ((difficultyRating - rating) / 400));
}

/** Bigger steps for the first few attempts so the estimate settles quickly. */
export function kFactor(previousAttempts: number): number {
  return previousAttempts < 3 ? 64 : 32;
}

export interface AttemptInput {
  passed: number;
  total: number;
  hints: number;
  minutes: number;
  targetMinutes: number;
}

export function attemptScore({ passed, total, hints, minutes, targetMinutes }: AttemptInput): number {
  if (total <= 0) return 0;
  const passRatio = Math.min(1, Math.max(0, passed / total));
  const rung = Math.min(MAX_HINT_RUNG, Math.max(0, Math.round(hints)));
  const hintFactor = HINT_DISCOUNT[rung] ?? 0;
  const over = targetMinutes > 0 ? (minutes - targetMinutes) / targetMinutes : 0;
  const timeFactor = over <= 0 ? 1 : Math.max(0.7, 1 - 0.3 * over);
  return passRatio * hintFactor * timeFactor;
}

export function updateRating(rating: number, previousAttempts: number, difficulty: Difficulty, score: number): number {
  const e = expectedScore(rating, DIFFICULTY_RATING[difficulty]);
  return rating + kFactor(previousAttempts) * (score - e);
}

export function masteryOf(rating: number): number {
  return expectedScore(rating, DIFFICULTY_RATING.medium);
}

/** Inverse of masteryOf, used when placement sets a skill level directly. */
export function ratingForMastery(mastery: number): number {
  const m = Math.min(0.99, Math.max(0.01, mastery));
  return DIFFICULTY_RATING.medium - 400 * Math.log10(1 / m - 1);
}
