import { createEmptyCard, fsrs, generatorParameters, Rating, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import type { CardState, LearnerState, StoredFsrsCard } from './types.ts';

const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

export const GRADES: Record<'again' | 'hard' | 'good' | 'easy', Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};
export type GradeName = keyof typeof GRADES;

export function isGradeName(v: string): v is GradeName {
  return v in GRADES;
}

function toStored(card: FsrsCard): StoredFsrsCard {
  const { due, last_review, ...rest } = card;
  return last_review ? { ...rest, due: due.toISOString(), last_review: last_review.toISOString() } : { ...rest, due: due.toISOString() };
}

function fromStored(card: StoredFsrsCard): FsrsCard {
  const { due, last_review, ...rest } = card;
  return last_review ? { ...rest, due: new Date(due), last_review: new Date(last_review) } : { ...rest, due: new Date(due) };
}

/** Add a card to the review queue. Returns false if it was already enrolled. */
export function enrollCard(state: LearnerState, cardId: string, now: Date, dueAt?: Date): boolean {
  if (state.cards[cardId]) return false;
  const card = createEmptyCard(now);
  if (dueAt) card.due = dueAt;
  state.cards[cardId] = { id: cardId, enrolledAt: now.toISOString(), reviews: 0, fsrs: toStored(card) };
  return true;
}

export function dueCards(state: LearnerState, now: Date): CardState[] {
  return Object.values(state.cards)
    .filter((c) => new Date(c.fsrs.due) <= now)
    .sort((a, b) => a.fsrs.due.localeCompare(b.fsrs.due));
}

export function gradeCard(state: LearnerState, cardId: string, grade: GradeName, now: Date): { due: Date; intervalDays: number } {
  const current = state.cards[cardId];
  if (!current) throw new Error(`Card "${cardId}" is not in your review queue.`);
  const { card } = scheduler.next(fromStored(current.fsrs), now, GRADES[grade]);
  state.cards[cardId] = {
    ...current,
    reviews: current.reviews + 1,
    lastGrade: grade,
    lastReviewedAt: now.toISOString(),
    fsrs: toStored(card),
  };
  return { due: card.due, intervalDays: (card.due.getTime() - now.getTime()) / 86_400_000 };
}

export const RESOLVE_PREFIX = 'resolve:';
export const CUSTOM_PREFIX = 'custom:';
