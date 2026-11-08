import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readYaml } from '../util/fs.ts';

export interface Profile {
  id: string;
  name: string;
  headline: string;
  summary: string;
  exerciseLanguage: string;
  /** Normalized so the weights sum to 1. Tracks not listed get 0. */
  trackWeights: Record<string, number>;
  weekdayMinutes: number;
  weekendMinutes: number;
  interview: { active: boolean; targetDate?: string; targetRoles: string[] };
  goals: string[];
  strengths: string[];
  tutorNotes: string;
  file: string;
  raw: Record<string, unknown>;
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

export function profilePath(learnersDir: string, id: string): string {
  return join(learnersDir, id, 'profile.yaml');
}

export function loadProfile(learnersDir: string, id: string): Profile {
  if (!id) throw new Error('No learner selected. Set `learner:` in dojo.config.yaml or run /dojo-setup.');
  const file = profilePath(learnersDir, id);
  if (!existsSync(file)) {
    throw new Error(`No profile at ${file}. Copy learners/_template/profile.yaml there, or run /dojo-setup in Claude Code.`);
  }
  return parseProfile(readYaml(file), file, id);
}

export function parseProfile(data: unknown, file: string, fallbackId: string): Profile {
  const raw = (data ?? {}) as Record<string, unknown>;
  const tracks = (raw.tracks ?? {}) as Record<string, unknown>;
  const weights: Record<string, number> = {};
  for (const [id, w] of Object.entries(tracks)) {
    const n = Number(w);
    if (Number.isFinite(n) && n > 0) weights[id] = n;
  }
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total > 0) for (const id of Object.keys(weights)) weights[id] = (weights[id] ?? 0) / total;

  const schedule = (raw.schedule ?? {}) as Record<string, unknown>;
  const interview = (raw.interview ?? {}) as Record<string, unknown>;
  const tutor = (raw.tutor ?? {}) as Record<string, unknown>;
  const targetDate = interview.target_date ? String(interview.target_date) : undefined;

  return {
    id: String(raw.id ?? fallbackId),
    name: String(raw.name ?? fallbackId),
    headline: String(raw.headline ?? ''),
    summary: String(raw.summary ?? '').trim(),
    exerciseLanguage: String(raw.exercise_language ?? 'typescript'),
    trackWeights: weights,
    weekdayMinutes: Number(schedule.weekday_minutes ?? 45),
    weekendMinutes: Number(schedule.weekend_minutes ?? 90),
    interview: {
      active: Boolean(interview.active ?? false),
      ...(targetDate ? { targetDate } : {}),
      targetRoles: strings(interview.target_roles),
    },
    goals: strings(raw.learning_goals),
    strengths: strings(raw.strengths),
    tutorNotes: String(tutor.notes ?? '').trim(),
    file,
    raw,
  };
}
