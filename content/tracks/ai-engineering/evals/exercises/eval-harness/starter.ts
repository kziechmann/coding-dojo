// Eval harness. See README.md; run `./dojo test eval-harness`.

export interface EvalCase<I = unknown> {
  id: string;
  input: I;
  expected?: unknown;
  tags?: string[];
}

export interface GradeResult {
  pass: boolean;
  score?: number;
  reason?: string;
}

export type Grader = (output: unknown, evalCase: EvalCase<any>) => GradeResult | Promise<GradeResult>;

export interface CaseResult {
  id: string;
  pass: boolean;
  score: number;
  tags: string[];
  reason?: string;
  error?: string;
}

export interface RunReport {
  results: CaseResult[];
  passRate: number;
  ci95: [number, number];
  byTag: Record<string, { n: number; passRate: number }>;
}

export interface Comparison {
  regressions: string[];
  fixes: string[];
  delta: number;
  significant: boolean;
}

export function wilsonInterval(passes: number, n: number, z = 1.96): [number, number] {
  throw new Error('TODO: implement wilsonInterval()');
}

export const exactMatch: Grader = (output, evalCase) => {
  throw new Error('TODO: implement exactMatch');
};

export async function runEval<I>(
  cases: EvalCase<I>[],
  system: (input: I) => Promise<unknown>,
  grader: Grader,
  options: { concurrency?: number } = {},
): Promise<RunReport> {
  throw new Error('TODO: implement runEval()');
}

export function compareRuns(baseline: RunReport, candidate: RunReport): Comparison {
  throw new Error('TODO: implement compareRuns()');
}
