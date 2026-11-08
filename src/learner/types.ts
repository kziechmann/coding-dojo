import type { Card as FsrsCard } from 'ts-fsrs';

export type StoredFsrsCard = Omit<FsrsCard, 'due' | 'last_review'> & { due: string; last_review?: string };

export type SkillSource = 'attempt' | 'placement' | 'scorecard';

export interface SkillState {
  rating: number;
  attempts: number;
  updatedAt: string;
  source: SkillSource;
}

export interface TestCaseResult {
  name: string;
  ok: boolean;
  durationMs: number;
  error?: string;
}

export interface TestSummary {
  at: string;
  passed: number;
  failed: number;
  total: number;
  timedOut: boolean;
  sandbox: 'local' | 'docker';
}

export type ExerciseStatus = 'in-progress' | 'passed' | 'assisted';

export interface ExerciseState {
  status: ExerciseStatus;
  startedAt: string;
  completedAt?: string;
  bestScore: number;
  attempts: number;
  lastTest?: TestSummary;
}

export interface CardState {
  id: string;
  enrolledAt: string;
  reviews: number;
  lastGrade?: string;
  lastReviewedAt?: string;
  fsrs: StoredFsrsCard;
}

/** A card the learner (or tutor) wrote during Free Play: "save this". */
export interface CustomCard {
  id: string;
  skill?: string;
  front: string;
  back: string;
  createdAt: string;
}

export interface Attempt {
  at: string;
  exercise: string;
  passed: number;
  total: number;
  hints: number;
  minutes: number;
  score: number;
  outcome: ExerciseStatus;
  notes?: string;
}

export interface SessionLog {
  at: string;
  mode: string;
  minutes: number;
  track?: string;
  module?: string;
  notes?: string;
}

/** Misconceptions and other things the tutor should remember. */
export interface Note {
  id: number;
  at: string;
  text: string;
  skill?: string;
  resolvedAt?: string;
}

export interface ScorecardEntry {
  at: string;
  round: string;
  file: string;
  signal?: string;
  average: number;
}

export interface LearnerState {
  version: 1;
  learner: string;
  createdAt: string;
  skills: Record<string, SkillState>;
  exercises: Record<string, ExerciseState>;
  cards: Record<string, CardState>;
  customCards: Record<string, CustomCard>;
  attempts: Attempt[];
  sessions: SessionLog[];
  notes: Note[];
  scorecards: ScorecardEntry[];
}
