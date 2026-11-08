import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import YAML from 'yaml';

export function readYaml(file: string): unknown {
  return YAML.parse(readFileSync(file, 'utf8'));
}

export function listDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith('.') && !name.startsWith('_') && statSync(`${dir}/${name}`).isDirectory())
    .sort();
}

/** Write JSON via a temp file and rename, so a crash never leaves half a file. */
export function writeJsonAtomic(file: string, data: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(tmp, file);
}
