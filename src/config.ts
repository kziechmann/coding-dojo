import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export type SandboxMode = 'auto' | 'local' | 'docker';

export interface DojoConfig {
  root: string;
  learner: string;
  contentDir: string;
  learnersDir: string;
  sandbox: SandboxMode;
  dockerImage: string;
  dockerRuntime: string;
  testTimeoutMs: number;
}

const SANDBOX_MODES: readonly SandboxMode[] = ['auto', 'local', 'docker'];

/**
 * Reads dojo.config.yaml. Environment variables win, so tests and other
 * learners can point the CLI elsewhere without editing the file:
 * DOJO_LEARNER, DOJO_LEARNERS_DIR, DOJO_CONTENT_DIR, DOJO_SANDBOX.
 */
export function loadConfig(root: string = REPO_ROOT, env: NodeJS.ProcessEnv = process.env): DojoConfig {
  const file = join(root, 'dojo.config.yaml');
  const raw: Record<string, unknown> = existsSync(file) ? (YAML.parse(readFileSync(file, 'utf8')) ?? {}) : {};
  const sandbox = String(env.DOJO_SANDBOX ?? raw.sandbox ?? 'auto') as SandboxMode;
  if (!SANDBOX_MODES.includes(sandbox)) {
    throw new Error(`sandbox must be one of ${SANDBOX_MODES.join(', ')}; got "${sandbox}"`);
  }
  return {
    root,
    learner: String(env.DOJO_LEARNER ?? raw.learner ?? ''),
    contentDir: resolve(root, String(env.DOJO_CONTENT_DIR ?? raw.content_dir ?? 'content')),
    learnersDir: resolve(root, String(env.DOJO_LEARNERS_DIR ?? raw.learners_dir ?? 'learners')),
    sandbox,
    dockerImage: String(raw.docker_image ?? 'node:24-alpine'),
    dockerRuntime: String(raw.docker_runtime ?? ''),
    testTimeoutMs: Number(raw.test_timeout_seconds ?? 60) * 1000,
  };
}
