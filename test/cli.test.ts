import assert from 'node:assert/strict';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { REPO_ROOT } from '../src/config.ts';
import { main } from '../src/cli.ts';

let dir: string;

async function dojo(...argv: string[]): Promise<{ code: number; out: string }> {
  const lines: string[] = [];
  const code = await main(argv, (s = '') => lines.push(s));
  return { code, out: lines.join('\n') };
}

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'dojo-cli-'));
  cpSync(join(REPO_ROOT, 'learners', '_template'), join(dir, '_template'), { recursive: true });
  mkdirSync(join(dir, 'tester'));
  writeFileSync(
    join(dir, 'tester', 'profile.yaml'),
    'id: tester\nname: Test Learner\ntracks: { system-design: 2, ai-engineering: 1 }\nschedule: { weekday_minutes: 60, weekend_minutes: 60 }\n',
  );
  process.env.DOJO_LEARNERS_DIR = dir;
  process.env.DOJO_LEARNER = 'tester';
  process.env.DOJO_SANDBOX = 'local';
  process.env.DOJO_NOW = '2026-11-09T17:00:00Z';
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.DOJO_LEARNERS_DIR;
  delete process.env.DOJO_LEARNER;
  delete process.env.DOJO_SANDBOX;
  delete process.env.DOJO_NOW;
});

test('help and unknown commands', async () => {
  assert.match((await dojo('help')).out, /Plan today's session/);
  assert.equal((await dojo('nope')).code, 2);
});

test('context and today work for a brand-new learner', async () => {
  const ctx = await dojo('context');
  assert.equal(ctx.code, 0);
  assert.match(ctx.out, /Test Learner/);
  assert.match(ctx.out, /Suggest \/placement/);
  const today = await dojo('today');
  assert.equal(today.code, 0);
  assert.match(today.out, /Lesson: /);
});

test('start → test → attempt updates the learner model', async () => {
  const start = await dojo('start', 'capacity-calculator');
  assert.equal(start.code, 0, start.out);
  const workspace = join(dir, 'tester', 'workspace', 'estimation', 'capacity-calculator', 'solution.ts');
  assert.match(readFileSync(workspace, 'utf8'), /TODO/);

  const failing = await dojo('test', 'capacity-calculator');
  assert.equal(failing.code, 1);

  copyFileSync(join(REPO_ROOT, 'content/tracks/system-design/estimation/exercises/capacity-calculator/reference.ts'), workspace);
  const passing = await dojo('test', 'capacity-calculator');
  assert.equal(passing.code, 0, passing.out);
  assert.match(passing.out, /All green/);

  const attempt = await dojo('attempt', 'capacity-calculator', '--hints', '1', '--minutes', '18');
  assert.equal(attempt.code, 0, attempt.out);
  assert.match(attempt.out, /passed/);

  const state = JSON.parse(readFileSync(join(dir, 'tester', 'state.json'), 'utf8'));
  assert.equal(state.exercises['estimation/capacity-calculator'].status, 'passed');
  assert.ok(state.skills['sd.estimation'].rating > 1000);
  assert.ok(Object.keys(state.cards).some((id: string) => id.startsWith('estimation/')), 'module cards are queued');
});

test('attempt without test results explains what to do', async () => {
  await dojo('start', 'token-bucket');
  const r = await dojo('attempt', 'token-bucket', '--hints', '0', '--minutes', '5');
  assert.equal(r.code, 1);
  assert.match(r.out, /Run `\.\/dojo test/);
});

test('review queue: nothing due today, cards due tomorrow, grading reschedules', async () => {
  assert.match((await dojo('review')).out, /Nothing due/);
  process.env.DOJO_NOW = '2026-11-10T18:00:00Z';
  const due = await dojo('review');
  assert.match(due.out, /\[estimation\/seconds-per-day\]/);
  const shown = await dojo('review', 'show', 'estimation/seconds-per-day');
  assert.match(shown.out, /86,400/);
  const graded = await dojo('review', 'grade', 'estimation/seconds-per-day', 'good');
  assert.match(graded.out, /Next review/);
  assert.equal((await dojo('review', 'grade', 'estimation/seconds-per-day', 'meh')).code, 2);
  process.env.DOJO_NOW = '2026-11-09T17:00:00Z';
});

test('placement, notes, custom cards and session logs persist', async () => {
  assert.equal((await dojo('placement', 'ai.evals.harness', '0.75')).code, 0);
  assert.equal((await dojo('placement', 'not.a.skill', '0.5')).code, 2);
  assert.match((await dojo('note', 'add', 'confuses', 'tf', 'saturation', '--skill', 'ai.retrieval.ranking')).out, /Note 1 saved/);
  assert.match((await dojo('review', 'add', '--front', 'What is p95?', '--back', 'The 95th percentile')).out, /custom:1/);
  assert.equal((await dojo('log', '--mode', 'lesson', '--minutes', '40', '--module', 'estimation')).code, 0);
  const ctx = (await dojo('context')).out;
  assert.match(ctx, /confuses tf saturation/);
  assert.match(ctx, /lesson estimation, 40 min/);
  assert.match((await dojo('skills', '--track', 'ai-engineering')).out, /ai\.evals\.harness\s+█/);
});

test('scorecards update skills listed in them', async () => {
  const file = join(dir, 'card.yaml');
  writeFileSync(file, 'round: system-design\nscores: { requirements: 3, estimation: 2 }\nsignal: lean hire\nskills: { sd.design.process: 4 }\n');
  const r = await dojo('scorecard', 'add', file);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /average 2\.50\/4/);
  assert.match(r.out, /sd\.design\.process/);
  assert.match((await dojo('scorecard', 'list')).out, /system-design/);
});

test('validate reports bundled content as clean', async () => {
  assert.match((await dojo('validate')).out, /Content OK/);
});
