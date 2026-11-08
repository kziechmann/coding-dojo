// LRU cache with TTLs. See README.md; run `./dojo test lru-ttl-cache`.

export interface LruOptions {
  maxEntries: number;
  defaultTtlMs?: number;
  /** Returns the current time in milliseconds. Defaults to Date.now. */
  clock?: () => number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
}

export class LruCache<V> {
  constructor(options: LruOptions) {
    throw new Error('TODO: implement the constructor');
  }

  get(key: string): V | undefined {
    throw new Error('TODO: implement get()');
  }

  set(key: string, value: V, ttlMs?: number): void {
    throw new Error('TODO: implement set()');
  }

  has(key: string): boolean {
    throw new Error('TODO: implement has()');
  }

  delete(key: string): boolean {
    throw new Error('TODO: implement delete()');
  }

  get size(): number {
    throw new Error('TODO: implement size');
  }

  stats(): CacheStats {
    throw new Error('TODO: implement stats()');
  }
}
