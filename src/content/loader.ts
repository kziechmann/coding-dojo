import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { listDirs, readYaml } from '../util/fs.ts';
import type {
  Card,
  CardKind,
  Catalog,
  Difficulty,
  Exercise,
  ExerciseKind,
  Link,
  Module,
  PlannedModule,
  Skill,
  Track,
} from './types.ts';

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
const EXERCISE_KINDS: readonly ExerciseKind[] = ['code', 'design'];
const CARD_KINDS: readonly CardKind[] = ['recall', 'predict', 'spot-the-bug', 'complexity', 'compare', 'design'];

type Raw = Record<string, unknown>;

/** Small reader that records problems instead of throwing, so one bad file doesn't hide the rest. */
class Reader {
  private readonly issues: string[];
  private readonly where: string;

  constructor(issues: string[], where: string) {
    this.issues = issues;
    this.where = where;
  }

  str(raw: Raw, key: string, fallback?: string): string {
    const v = raw[key];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
    if (fallback !== undefined) return fallback;
    this.issues.push(`${this.where}: "${key}" must be a non-empty string`);
    return '';
  }

  num(raw: Raw, key: string, fallback: number): number {
    const v = raw[key];
    if (v === undefined) return fallback;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    this.issues.push(`${this.where}: "${key}" must be a number`);
    return fallback;
  }

  list(raw: Raw, key: string): unknown[] {
    const v = raw[key];
    if (v === undefined || v === null) return [];
    if (Array.isArray(v)) return v;
    this.issues.push(`${this.where}: "${key}" must be a list`);
    return [];
  }

  oneOf<T extends string>(raw: Raw, key: string, allowed: readonly T[], fallback: T): T {
    const v = raw[key] ?? fallback;
    if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T;
    this.issues.push(`${this.where}: "${key}" must be one of ${allowed.join(', ')}`);
    return fallback;
  }
}

function asRaw(v: unknown): Raw {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {};
}

export function loadCatalog(contentDir: string): Catalog {
  const issues: string[] = [];
  const catalog: Catalog = {
    contentDir,
    tracks: [],
    modules: new Map(),
    exercises: new Map(),
    skills: new Map(),
    cards: new Map(),
    issues,
  };

  const tracksFile = join(contentDir, 'tracks.yaml');
  if (!existsSync(tracksFile)) {
    issues.push(`missing ${tracksFile}`);
    return catalog;
  }
  for (const rawTrack of new Reader(issues, 'tracks.yaml').list(asRaw(readYaml(tracksFile)), 'tracks')) {
    const t = asRaw(rawTrack);
    const r = new Reader(issues, `tracks.yaml (${String(t.id ?? '?')})`);
    const planned: PlannedModule[] = r.list(t, 'planned').map((p) => {
      const raw = asRaw(p);
      const pr = new Reader(issues, `tracks.yaml planned module`);
      const summary = typeof raw.summary === 'string' ? raw.summary : undefined;
      return summary ? { id: pr.str(raw, 'id'), title: pr.str(raw, 'title'), summary } : { id: pr.str(raw, 'id'), title: pr.str(raw, 'title') };
    });
    catalog.tracks.push({ id: r.str(t, 'id'), title: r.str(t, 'title'), summary: r.str(t, 'summary', ''), planned, modules: [] });
  }
  const tracksById = new Map(catalog.tracks.map((t) => [t.id, t]));

  const tracksDir = join(contentDir, 'tracks');
  for (const trackDir of listDirs(tracksDir)) {
    const track = tracksById.get(trackDir);
    if (!track) {
      issues.push(`content/tracks/${trackDir} is not listed in tracks.yaml`);
      continue;
    }
    for (const moduleDir of listDirs(join(tracksDir, trackDir))) {
      const dir = join(tracksDir, trackDir, moduleDir);
      const file = join(dir, 'module.yaml');
      if (!existsSync(file)) {
        issues.push(`${trackDir}/${moduleDir}: missing module.yaml`);
        continue;
      }
      const mod = parseModule(asRaw(readYaml(file)), dir, track, issues);
      if (mod.id !== moduleDir) issues.push(`${trackDir}/${moduleDir}: module id "${mod.id}" must match its folder name`);
      if (catalog.modules.has(mod.id)) {
        issues.push(`duplicate module id "${mod.id}"`);
        continue;
      }
      catalog.modules.set(mod.id, mod);
      track.modules.push(mod);
      for (const s of mod.skills) {
        if (catalog.skills.has(s.id)) issues.push(`duplicate skill id "${s.id}" (in ${mod.id})`);
        catalog.skills.set(s.id, s);
      }
      for (const e of mod.exercises) catalog.exercises.set(e.key, e);
      for (const c of mod.cards) {
        if (catalog.cards.has(c.id)) issues.push(`duplicate card id "${c.id}"`);
        catalog.cards.set(c.id, c);
      }
    }
  }

  for (const track of catalog.tracks) track.modules.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  for (const mod of catalog.modules.values()) {
    for (const p of mod.prerequisites) {
      if (!catalog.modules.has(p)) issues.push(`${mod.id}: prerequisite "${p}" is not a module`);
    }
  }
  return catalog;
}

function parseModule(raw: Raw, dir: string, track: Track, issues: string[]): Module {
  const id = typeof raw.id === 'string' ? raw.id : '?';
  const r = new Reader(issues, `${track.id}/${id}/module.yaml`);
  if (raw.track !== undefined && raw.track !== track.id) issues.push(`${track.id}/${id}: "track" says ${String(raw.track)} but the folder is in ${track.id}`);

  const skills: Skill[] = r.list(raw, 'skills').map((s) => {
    const sr = asRaw(s);
    return {
      id: r.str(sr, 'id'),
      title: r.str(sr, 'title'),
      interviewWeight: r.num(sr, 'interview_weight', 0.5),
      moduleId: id,
      trackId: track.id,
    };
  });
  const skillIds = new Set(skills.map((s) => s.id));

  const exercises: Exercise[] = r.list(raw, 'exercises').map((e) => {
    const er = asRaw(e);
    const exId = r.str(er, 'id');
    const exSkills = r.list(er, 'skills').map(String);
    for (const s of exSkills) if (!skillIds.has(s)) issues.push(`${id}/${exId}: skill "${s}" is not defined in this module`);
    if (exSkills.length === 0) issues.push(`${id}/${exId}: list at least one skill`);
    return {
      id: exId,
      key: `${id}/${exId}`,
      title: r.str(er, 'title'),
      kind: r.oneOf(er, 'kind', EXERCISE_KINDS, 'code'),
      difficulty: r.oneOf(er, 'difficulty', DIFFICULTIES, 'medium'),
      minutes: r.num(er, 'minutes', 25),
      skills: exSkills,
      dir: join(dir, 'exercises', exId),
      moduleId: id,
      trackId: track.id,
    };
  });

  const cards: Card[] = [];
  const cardsFile = join(dir, 'cards.yaml');
  if (existsSync(cardsFile)) {
    const cr = new Reader(issues, `${track.id}/${id}/cards.yaml`);
    const rawCards = readYaml(cardsFile);
    for (const c of Array.isArray(rawCards) ? rawCards : cr.list(asRaw(rawCards), 'cards')) {
      const card = asRaw(c);
      const skill = cr.str(card, 'skill');
      if (skill && !skillIds.has(skill)) issues.push(`${id} cards: skill "${skill}" is not defined in this module`);
      cards.push({
        id: `${id}/${cr.str(card, 'id')}`,
        skill,
        kind: cr.oneOf(card, 'kind', CARD_KINDS, 'recall'),
        front: cr.str(card, 'front'),
        back: cr.str(card, 'back'),
        moduleId: id,
      });
    }
  }

  const links: Link[] = r.list(raw, 'links').map((l) => {
    const lr = asRaw(l);
    return { title: r.str(lr, 'title'), url: r.str(lr, 'url') };
  });

  return {
    id: r.str(raw, 'id'),
    trackId: track.id,
    order: r.num(raw, 'order', 100),
    title: r.str(raw, 'title'),
    summary: r.str(raw, 'summary'),
    level: r.str(raw, 'level', 'intermediate'),
    minutes: r.num(raw, 'minutes', 60),
    prerequisites: r.list(raw, 'prerequisites').map(String),
    objectives: r.list(raw, 'objectives').map(String),
    skills,
    exercises,
    cards,
    links,
    dir,
  };
}

/** Resolve "token-bucket", "rate-limiting/token-bucket" or "system-design/rate-limiting/token-bucket". */
export function findExercise(catalog: Catalog, ref: string): Exercise {
  const parts = ref.replace(/^\/+|\/+$/g, '').split('/');
  const key = parts.slice(-2).join('/');
  const direct = parts.length >= 2 ? catalog.exercises.get(key) : undefined;
  if (direct) return direct;
  const matches = [...catalog.exercises.values()].filter((e) => e.id === ref);
  if (matches.length === 1 && matches[0]) return matches[0];
  if (matches.length > 1) throw new Error(`"${ref}" is ambiguous: ${matches.map((m) => m.key).join(', ')}`);
  throw new Error(`No exercise "${ref}". Run \`./dojo modules\` to list them.`);
}

export function findModule(catalog: Catalog, ref: string): Module {
  const id = ref.replace(/\/+$/, '').split('/').pop() ?? ref;
  const mod = catalog.modules.get(id);
  if (!mod) throw new Error(`No module "${ref}". Run \`./dojo modules\` to list them.`);
  return mod;
}
