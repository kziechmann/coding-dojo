import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DojoConfig } from '../config.ts';
import { runExerciseTests } from '../runner/run.ts';
import { readYaml } from '../util/fs.ts';
import type { Catalog, Exercise } from './types.ts';

export interface ValidationReport {
  errors: string[];
  checkedSolutions: number;
}

export const BRIEF_MAX_WORDS = 700;

export function structuralIssues(catalog: Catalog): string[] {
  const errors = [...catalog.issues];
  for (const mod of catalog.modules.values()) {
    const where = `${mod.trackId}/${mod.id}`;
    const brief = join(mod.dir, 'brief.md');
    if (!existsSync(brief)) errors.push(`${where}: missing brief.md`);
    else if (briefWordCount(readFileSync(brief, 'utf8')) > BRIEF_MAX_WORDS) errors.push(`${where}: brief.md is over ${BRIEF_MAX_WORDS} words`);
    if (mod.skills.length === 0) errors.push(`${where}: define at least one skill`);
    if (mod.exercises.length === 0) errors.push(`${where}: define at least one exercise`);
    if (mod.cards.length < 3) errors.push(`${where}: write at least 3 review cards (has ${mod.cards.length})`);
    for (const ex of mod.exercises) errors.push(...exerciseIssues(ex));
  }
  return errors;
}

function exerciseIssues(ex: Exercise): string[] {
  const where = ex.key;
  if (!existsSync(ex.dir)) return [`${where}: missing folder ${ex.dir}`];
  const files = readdirSync(ex.dir);
  const errors: string[] = [];
  if (!files.includes('README.md')) errors.push(`${where}: missing README.md`);
  if (ex.kind === 'code') {
    for (const f of ['starter.ts', 'reference.ts']) if (!files.includes(f)) errors.push(`${where}: missing ${f}`);
    if (!files.some((f) => f.endsWith('.test.ts'))) errors.push(`${where}: missing a *.test.ts file`);
  } else {
    if (!files.includes('starter.md')) errors.push(`${where}: missing starter.md (the learner's design template)`);
    if (!files.includes('rubric.yaml')) errors.push(`${where}: missing rubric.yaml`);
    else {
      const rubric = readYaml(join(ex.dir, 'rubric.yaml')) as { dimensions?: unknown[] } | null;
      if (!Array.isArray(rubric?.dimensions) || rubric.dimensions.length === 0) errors.push(`${where}: rubric.yaml needs a "dimensions" list`);
    }
  }
  return errors;
}

export function briefWordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Run every code exercise's tests twice: against reference.ts (all must pass)
 * and against starter.ts (at least one must fail, or the tests prove nothing).
 */
export async function solutionIssues(catalog: Catalog, config: DojoConfig): Promise<{ errors: string[]; checked: number }> {
  const errors: string[] = [];
  let checked = 0;
  for (const ex of catalog.exercises.values()) {
    if (ex.kind !== 'code' || !existsSync(join(ex.dir, 'reference.ts'))) continue;
    const base = { exercise: ex, sandbox: 'local' as const, timeoutMs: config.testTimeoutMs, dockerImage: config.dockerImage };
    const ref = await runExerciseTests({ ...base, solutionPath: join(ex.dir, 'reference.ts') });
    checked++;
    if (ref.total === 0) errors.push(`${ex.key}: no tests ran against reference.ts`);
    for (const c of ref.cases.filter((c) => !c.ok)) errors.push(`${ex.key}: reference fails "${c.name}": ${c.error ?? ''}`.trim());
    const starter = await runExerciseTests({ ...base, solutionPath: join(ex.dir, 'starter.ts') });
    if (starter.total > 0 && starter.failed === 0) errors.push(`${ex.key}: every test passes against starter.ts, so the tests check nothing`);
  }
  return { errors, checked };
}
