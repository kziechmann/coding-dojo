// Token bucket. See README.md; run `./dojo test token-bucket`.

export interface TokenBucketOptions {
  capacity: number;
  refillPerSecond: number;
  /** Returns the current time in milliseconds. Defaults to Date.now. */
  clock?: () => number;
}

export class TokenBucket {
  constructor(options: TokenBucketOptions) {
    throw new Error('TODO: implement the constructor');
  }

  tryRemove(tokens = 1): boolean {
    throw new Error('TODO: implement tryRemove()');
  }

  available(): number {
    throw new Error('TODO: implement available()');
  }

  retryAfterMs(tokens = 1): number {
    throw new Error('TODO: implement retryAfterMs()');
  }
}
