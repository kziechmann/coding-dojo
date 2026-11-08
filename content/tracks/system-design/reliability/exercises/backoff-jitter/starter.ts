// Backoff with jitter. See README.md; run `./dojo test backoff-jitter`.

export type Jitter = 'none' | 'full' | 'equal';

export interface BackoffOptions {
  baseMs: number;
  maxMs: number;
  jitter: Jitter;
}

export interface RetryOptions extends BackoffOptions {
  maxAttempts: number;
  isRetryable?: (error: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export function backoffDelay(attempt: number, options: BackoffOptions, random: () => number = Math.random): number {
  throw new Error('TODO: implement backoffDelay()');
}

export async function retry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  throw new Error('TODO: implement retry()');
}
