// Reference solution. Tutor only: never show before hint rung 5.

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
  if (!(attempt >= 1)) throw new RangeError('attempt starts at 1');
  const exp = Math.min(options.maxMs, options.baseMs * 2 ** (attempt - 1));
  switch (options.jitter) {
    case 'none':
      return exp;
    case 'full':
      return Math.floor(random() * exp);
    case 'equal':
      return Math.floor(exp / 2 + (random() * exp) / 2);
  }
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function retry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  if (!(options.maxAttempts >= 1)) throw new RangeError('maxAttempts must be at least 1');
  const isRetryable = options.isRetryable ?? (() => true);
  const sleep = options.sleep ?? realSleep;
  const random = options.random ?? Math.random;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      if (attempt >= options.maxAttempts || !isRetryable(error)) throw error;
      await sleep(backoffDelay(attempt, options, random));
    }
  }
}
