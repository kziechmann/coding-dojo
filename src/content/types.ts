export type Difficulty = 'easy' | 'medium' | 'hard';
export type ExerciseKind = 'code' | 'design';
export type CardKind = 'recall' | 'predict' | 'spot-the-bug' | 'complexity' | 'compare' | 'design';

export interface Skill {
  id: string;
  title: string;
  /** 0..1: how often this comes up in interviews. */
  interviewWeight: number;
  moduleId: string;
  trackId: string;
}

export interface Exercise {
  id: string;
  /** Globally unique: `<module>/<exercise>`. */
  key: string;
  title: string;
  kind: ExerciseKind;
  difficulty: Difficulty;
  minutes: number;
  skills: string[];
  dir: string;
  moduleId: string;
  trackId: string;
}

export interface Card {
  /** Globally unique: `<module>/<local id>`. */
  id: string;
  skill: string;
  kind: CardKind;
  front: string;
  back: string;
  moduleId: string;
}

export interface Link {
  title: string;
  url: string;
}

export interface Module {
  id: string;
  trackId: string;
  order: number;
  title: string;
  summary: string;
  level: string;
  minutes: number;
  /** Module ids that should come first. */
  prerequisites: string[];
  objectives: string[];
  skills: Skill[];
  exercises: Exercise[];
  cards: Card[];
  links: Link[];
  dir: string;
}

export interface PlannedModule {
  id: string;
  title: string;
  summary?: string;
}

export interface Track {
  id: string;
  title: string;
  summary: string;
  planned: PlannedModule[];
  modules: Module[];
}

export interface Catalog {
  contentDir: string;
  tracks: Track[];
  modules: Map<string, Module>;
  exercises: Map<string, Exercise>;
  skills: Map<string, Skill>;
  cards: Map<string, Card>;
  /** Problems found while loading; `dojo validate` reports them. */
  issues: string[];
}
