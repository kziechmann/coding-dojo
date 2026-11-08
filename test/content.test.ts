import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { loadConfig, REPO_ROOT } from '../src/config.ts';
import { findExercise, findModule, loadCatalog } from '../src/content/loader.ts';
import { structuralIssues } from '../src/content/validate.ts';
import { parseReporterOutput, dockerArgs } from '../src/runner/run.ts';

const catalog = loadCatalog(join(REPO_ROOT, 'content'));

test('bundled content has no structural issues', () => {
  assert.deepEqual(structuralIssues(catalog), []);
});

test('system design and AI engineering ship playable modules', () => {
  for (const id of ['system-design', 'ai-engineering', 'dsa']) {
    const track = catalog.tracks.find((t) => t.id === id);
    assert.ok(track && track.modules.length >= 2, `${id} should have modules`);
  }
});

test('every exercise skill and card skill exists', () => {
  for (const ex of catalog.exercises.values()) for (const s of ex.skills) assert.ok(catalog.skills.has(s), `${ex.key} → ${s}`);
  for (const c of catalog.cards.values()) assert.ok(catalog.skills.has(c.skill), `${c.id} → ${c.skill}`);
});

test('exercises resolve by short id, module/exercise or full path', () => {
  assert.equal(findExercise(catalog, 'token-bucket').key, 'rate-limiting/token-bucket');
  assert.equal(findExercise(catalog, 'rate-limiting/token-bucket').key, 'rate-limiting/token-bucket');
  assert.equal(findExercise(catalog, 'system-design/rate-limiting/token-bucket').key, 'rate-limiting/token-bucket');
  assert.throws(() => findExercise(catalog, 'does-not-exist'), /No exercise/);
  assert.equal(findModule(catalog, 'caching').trackId, 'system-design');
});

test('config honours environment overrides', () => {
  const config = loadConfig(REPO_ROOT, { DOJO_LEARNER: 'someone', DOJO_SANDBOX: 'local' });
  assert.equal(config.learner, 'someone');
  assert.equal(config.sandbox, 'local');
  assert.throws(() => loadConfig(REPO_ROOT, { DOJO_SANDBOX: 'vm' }), /sandbox must be one of/);
});

test('reporter output parsing counts leaf tests only and keeps learner output', () => {
  const stdout = [
    '{"event":"output","text":"debug line\\n"}',
    '{"event":"pass","name":"a","kind":"test","durationMs":1.2}',
    '{"event":"fail","name":"b","kind":"test","durationMs":2,"error":"2 !== 3"}',
    '{"event":"fail","name":"group","kind":"suite","error":"1 subtest failed"}',
    'not json',
  ].join('\n');
  const { cases, output } = parseReporterOutput(stdout);
  assert.deepEqual(cases.map((c) => [c.name, c.ok]), [
    ['a', true],
    ['b', false],
  ]);
  assert.equal(cases[1]!.error, '2 !== 3');
  assert.equal(output, 'debug line\n');
});

test('docker runs have no network, a read-only root and resource limits', () => {
  const ex = findExercise(catalog, 'token-bucket');
  const args = dockerArgs(
    { exercise: ex, solutionPath: '/tmp/learner/solution.ts', sandbox: 'docker', timeoutMs: 1000, dockerImage: 'node:24-alpine', dockerRuntime: 'runsc' },
    ['/x.test.ts'],
  ).join(' ');
  for (const flag of ['--network none', '--read-only', '--memory 512m', '--pids-limit 256', '--cap-drop ALL', '--runtime runsc']) {
    assert.ok(args.includes(flag), `missing ${flag}`);
  }
  assert.ok(args.includes('/tmp/learner:/solution:ro'));
});
