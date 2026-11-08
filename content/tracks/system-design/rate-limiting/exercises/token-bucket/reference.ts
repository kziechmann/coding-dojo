// Reference solution. Tutor only: never show before hint rung 5.

export interface TokenBucketOptions {
  capacity: number;
  refillPerSecond: number;
  clock?: () => number;
}

export class TokenBucket {
  private readonly capacity: number;
  private readonly ratePerMs: number;
  private readonly clock: () => number;
  private tokens: number;
  private last: number;

  constructor(options: TokenBucketOptions) {
    if (!(options.capacity > 0)) throw new RangeError('capacity must be positive');
    if (!(options.refillPerSecond >= 0)) throw new RangeError('refillPerSecond must be non-negative');
    this.capacity = options.capacity;
    this.ratePerMs = options.refillPerSecond / 1000;
    this.clock = options.clock ?? Date.now;
    this.tokens = options.capacity;
    this.last = this.clock();
  }

  private refill(): void {
    const now = this.clock();
    const elapsed = now - this.last;
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.ratePerMs);
      this.last = now;
    } else if (elapsed < 0) {
      // Clock went backwards: re-anchor without minting tokens.
      this.last = now;
    }
  }

  tryRemove(tokens = 1): boolean {
    this.refill();
    if (tokens > this.tokens) return false;
    this.tokens -= tokens;
    return true;
  }

  available(): number {
    this.refill();
    return this.tokens;
  }

  retryAfterMs(tokens = 1): number {
    this.refill();
    if (tokens > this.capacity) return Infinity;
    if (tokens <= this.tokens) return 0;
    if (this.ratePerMs === 0) return Infinity;
    return Math.ceil((tokens - this.tokens) / this.ratePerMs);
  }
}
