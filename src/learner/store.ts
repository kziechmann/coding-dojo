import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Exercise } from '../content/types.ts';
import { writeJsonAtomic } from '../util/fs.ts';
import type { LearnerState } from './types.ts';

export function emptyState(learner: string, now: Date = new Date()): LearnerState {
  return {
    version: 1,
    learner,
    createdAt: now.toISOString(),
    skills: {},
    exercises: {},
    cards: {},
    customCards: {},
    attempts: [],
    sessions: [],
    notes: [],
    scorecards: [],
  };
}

/** One JSON file per learner. Pretty-printed so `git diff` shows what a session changed. */
export class LearnerStore {
  readonly learner: string;
  readonly dir: string;
  readonly file: string;

  constructor(learnersDir: string, learner: string) {
    this.learner = learner;
    this.dir = join(learnersDir, learner);
    this.file = join(this.dir, 'state.json');
  }

  exists(): boolean {
    return existsSync(this.file);
  }

  load(): LearnerState {
    if (!this.exists()) return emptyState(this.learner);
    const data = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<LearnerState>;
    return { ...emptyState(this.learner), ...data };
  }

  save(state: LearnerState): void {
    writeJsonAtomic(this.file, state);
  }

  /** Where the learner's own attempt at an exercise lives. */
  solutionPath(exercise: Exercise): string {
    return join(this.dir, 'workspace', exercise.moduleId, exercise.id, exercise.kind === 'code' ? 'solution.ts' : 'design.md');
  }

  scorecardsDir(): string {
    return join(this.dir, 'scorecards');
  }
}
