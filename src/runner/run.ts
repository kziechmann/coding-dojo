import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { REPO_ROOT, type SandboxMode } from '../config.ts';
import type { Exercise } from '../content/types.ts';
import type { TestCaseResult } from '../learner/types.ts';

export interface TestResult {
  exercise: string;
  passed: number;
  failed: number;
  total: number;
  durationMs: number;
  timedOut: boolean;
  sandbox: 'local' | 'docker';
  cases: TestCaseResult[];
  /** console output from the learner's code, trimmed. */
  output: string;
}

export interface RunOptions {
  exercise: Exercise;
  /** File the tests import as the implementation (learner solution or reference). */
  solutionPath: string;
  sandbox: SandboxMode;
  timeoutMs: number;
  dockerImage: string;
  dockerRuntime?: string;
  repoRoot?: string;
}

const REPORTER = join(REPO_ROOT, 'src', 'runner', 'json-reporter.ts');
const MAX_OUTPUT = 4000;

export function testFiles(exercise: Exercise): string[] {
  return readdirSync(exercise.dir)
    .filter((f) => f.endsWith('.test.ts'))
    .sort()
    .map((f) => join(exercise.dir, f));
}

let dockerAvailable: boolean | undefined;
export function hasDocker(): boolean {
  if (dockerAvailable === undefined) {
    const res = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 4000, stdio: 'ignore' });
    dockerAvailable = res.status === 0;
  }
  return dockerAvailable;
}

/** The docker command line, exposed for tests and for `./dojo test --dry-run`. */
export function dockerArgs(opts: RunOptions, files: string[]): string[] {
  const root = opts.repoRoot ?? REPO_ROOT;
  const inRepo = (p: string) => `/dojo/${relative(root, p)}`;
  const args = [
    'run', '--rm',
    '--network', 'none',
    '--read-only',
    '--tmpfs', '/tmp:rw,size=64m',
    '--cpus', '1',
    '--memory', '512m',
    '--pids-limit', '256',
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges',
    '--user', 'node',
  ];
  if (opts.dockerRuntime) args.push('--runtime', opts.dockerRuntime);
  args.push(
    '-v', `${root}:/dojo:ro`,
    '-v', `${dirname(opts.solutionPath)}:/solution:ro`,
    '-e', `DOJO_SOLUTION=/solution/${basename(opts.solutionPath)}`,
    '-w', inRepo(opts.exercise.dir),
    opts.dockerImage,
    'node', '--disable-warning=ExperimentalWarning', '--test', `--test-reporter=${inRepo(REPORTER)}`,
    ...files.map(inRepo),
  );
  return args;
}

export function parseReporterOutput(stdout: string): { cases: TestCaseResult[]; output: string } {
  const cases: TestCaseResult[] = [];
  let output = '';
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('{')) continue;
    let ev: { event?: string; kind?: string; name?: string; durationMs?: number; error?: string; text?: string };
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.event === 'output') {
      if (output.length < MAX_OUTPUT) output += ev.text ?? '';
    } else if ((ev.event === 'pass' || ev.event === 'fail') && ev.kind === 'test') {
      const c: TestCaseResult = { name: ev.name ?? '?', ok: ev.event === 'pass', durationMs: Math.round(ev.durationMs ?? 0) };
      if (ev.error) c.error = ev.error;
      cases.push(c);
    }
  }
  return { cases, output: output.slice(0, MAX_OUTPUT) };
}

export async function runExerciseTests(opts: RunOptions): Promise<TestResult> {
  const files = testFiles(opts.exercise);
  if (files.length === 0) throw new Error(`${opts.exercise.key} has no *.test.ts files`);

  let mode: 'local' | 'docker' = 'local';
  if (opts.sandbox === 'docker') {
    if (!hasDocker()) throw new Error('sandbox is "docker" but the Docker daemon is not reachable.');
    mode = 'docker';
  } else if (opts.sandbox === 'auto' && hasDocker()) {
    mode = 'docker';
  }

  // When the Dojo itself runs under node:test, NODE_TEST_CONTEXT would make the
  // child report to our parent instead of through the JSON reporter.
  const { NODE_TEST_CONTEXT: _ignored, ...baseEnv } = process.env;
  const [cmd, args, env] =
    mode === 'docker'
      ? (['docker', dockerArgs(opts, files), baseEnv] as const)
      : ([
          process.execPath,
          ['--disable-warning=ExperimentalWarning', '--test', `--test-reporter=${REPORTER}`, ...files],
          { ...baseEnv, DOJO_SOLUTION: opts.solutionPath },
        ] as const);

  const started = Date.now();
  const { stdout, stderr, timedOut } = await new Promise<{ stdout: string; stderr: string; timedOut: boolean }>((resolve, reject) => {
    const child = spawn(cmd, [...args], { cwd: opts.exercise.dir, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
    }, opts.timeoutMs);
    child.stdout.on('data', (d: Buffer) => (out += d.toString()));
    child.stderr.on('data', (d: Buffer) => {
      if (err.length < MAX_OUTPUT) err += d.toString();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', () => {
      clearTimeout(timer);
      resolve({ stdout: out, stderr: err, timedOut: killed });
    });
  });

  const parsed = parseReporterOutput(stdout);
  const { cases } = parsed;
  // Nothing parsed usually means the runner itself failed (e.g. Docker couldn't start): surface stderr.
  const output = cases.length === 0 && stderr.trim() ? `${parsed.output}${stderr}`.slice(0, MAX_OUTPUT) : parsed.output;
  if (timedOut) cases.push({ name: `timed out after ${Math.round(opts.timeoutMs / 1000)}s`, ok: false, durationMs: opts.timeoutMs, error: 'Time limit exceeded: look for an infinite loop.' });
  const passed = cases.filter((c) => c.ok).length;
  return {
    exercise: opts.exercise.key,
    passed,
    failed: cases.length - passed,
    total: cases.length,
    durationMs: Date.now() - started,
    timedOut,
    sandbox: mode,
    cases,
    output,
  };
}
