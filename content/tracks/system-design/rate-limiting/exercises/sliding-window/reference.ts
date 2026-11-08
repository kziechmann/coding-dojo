// Reference solution. Tutor only: never show before hint rung 5.

export interface WindowOptions {
  limit: number;
  windowMs: number;
  clock?: () => number;
}

export class FixedWindowLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly clock: () => number;
  private readonly counts = new Map<string, { start: number; count: number }>();

  constructor(options: WindowOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.clock = options.clock ?? Date.now;
  }

  allow(key: string): boolean {
    const start = Math.floor(this.clock() / this.windowMs) * this.windowMs;
    const entry = this.counts.get(key);
    if (!entry || entry.start !== start) {
      this.counts.set(key, { start, count: 1 });
      return this.limit >= 1;
    }
    if (entry.count >= this.limit) return false;
    entry.count++;
    return true;
  }
}

interface Counts {
  start: number;
  previous: number;
  current: number;
}

export class SlidingWindowCounter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly clock: () => number;
  private readonly counts = new Map<string, Counts>();

  constructor(options: WindowOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.clock = options.clock ?? Date.now;
  }

  private roll(key: string, now: number): Counts {
    const start = Math.floor(now / this.windowMs) * this.windowMs;
    const c = this.counts.get(key) ?? { start, previous: 0, current: 0 };
    if (c.start !== start) {
      c.previous = start - c.start === this.windowMs ? c.current : 0;
      c.current = 0;
      c.start = start;
    }
    this.counts.set(key, c);
    return c;
  }

  estimate(key: string): number {
    const now = this.clock();
    const c = this.roll(key, now);
    return (c.previous * (this.windowMs - (now - c.start))) / this.windowMs + c.current;
  }

  allow(key: string): boolean {
    const now = this.clock();
    const c = this.roll(key, now);
    // Integer form of: previous * (W - elapsed) / W + current + 1 <= limit
    const weighted = c.previous * (this.windowMs - (now - c.start)) + (c.current + 1) * this.windowMs;
    if (weighted > this.limit * this.windowMs) return false;
    c.current++;
    return true;
  }
}
