// Window-based rate limiters. See README.md; run `./dojo test sliding-window`.

export interface WindowOptions {
  limit: number;
  windowMs: number;
  /** Returns the current time in milliseconds. Defaults to Date.now. */
  clock?: () => number;
}

export class FixedWindowLimiter {
  constructor(options: WindowOptions) {
    throw new Error('TODO: implement FixedWindowLimiter');
  }

  allow(key: string): boolean {
    throw new Error('TODO: implement allow()');
  }
}

export class SlidingWindowCounter {
  constructor(options: WindowOptions) {
    throw new Error('TODO: implement SlidingWindowCounter');
  }

  allow(key: string): boolean {
    throw new Error('TODO: implement allow()');
  }

  estimate(key: string): number {
    throw new Error('TODO: implement estimate()');
  }
}
