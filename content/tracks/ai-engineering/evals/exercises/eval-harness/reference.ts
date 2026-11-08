// Reference solution. Tutor only: never show before hint rung 5.
import { isDeepStrictEqual } from 'node:util';

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
  if (n === 0) return [0, 1];
  const p = passes / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

export const exactMatch: Grader = (output, evalCase) => {
  const pass = isDeepStrictEqual(output, evalCase.expected);
  return { pass, score: pass ? 1 : 0 };
};

async function runOne<I>(c: EvalCase<I>, system: (input: I) => Promise<unknown>, grader: Grader): Promise<CaseResult> {
  const tags = c.tags ?? [];
  try {
    const output = await system(c.input);
    const g = await grader(output, c);
    const result: CaseResult = { id: c.id, pass: g.pass, score: g.score ?? (g.pass ? 1 : 0), tags };
    if (g.reason !== undefined) result.reason = g.reason;
    return result;
  } catch (err) {
    return { id: c.id, pass: false, score: 0, tags, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runEval<I>(
  cases: EvalCase<I>[],
  system: (input: I) => Promise<unknown>,
  grader: Grader,
  options: { concurrency?: number } = {},
): Promise<RunReport> {
  const limit = Math.max(1, options.concurrency ?? 4);
  const results: CaseResult[] = new Array(cases.length);
  let next = 0;
  const worker = async () => {
    while (next < cases.length) {
      const i = next++;
      results[i] = await runOne(cases[i]!, system, grader);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, cases.length) }, worker));

  const passes = results.filter((r) => r.pass).length;
  const byTag: Record<string, { n: number; passRate: number }> = {};
  const counts = new Map<string, { n: number; passes: number }>();
  for (const r of results) {
    for (const t of r.tags) {
      const c = counts.get(t) ?? { n: 0, passes: 0 };
      c.n++;
      if (r.pass) c.passes++;
      counts.set(t, c);
    }
  }
  for (const [t, c] of counts) byTag[t] = { n: c.n, passRate: c.passes / c.n };
  return {
    results,
    passRate: cases.length ? passes / cases.length : 0,
    ci95: wilsonInterval(passes, cases.length),
    byTag,
  };
}

export function compareRuns(baseline: RunReport, candidate: RunReport): Comparison {
  const before = new Map(baseline.results.map((r) => [r.id, r.pass]));
  const regressions: string[] = [];
  const fixes: string[] = [];
  for (const r of candidate.results) {
    const was = before.get(r.id);
    if (was === undefined) continue;
    if (was && !r.pass) regressions.push(r.id);
    if (!was && r.pass) fixes.push(r.id);
  }
  const [bLow, bHigh] = baseline.ci95;
  const [cLow, cHigh] = candidate.ci95;
  return {
    regressions,
    fixes,
    delta: candidate.passRate - baseline.passRate,
    significant: cLow > bHigh || cHigh < bLow,
  };
}
