// Reference solution. Tutor only: never show before hint rung 5.

export interface LruOptions {
  maxEntries: number;
  defaultTtlMs?: number;
  clock?: () => number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
}

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class LruCache<V> {
  private readonly max: number;
  private readonly defaultTtlMs: number | undefined;
  private readonly clock: () => number;
  // Map iteration order is insertion order: the first key is the least recently used.
  private readonly entries = new Map<string, Entry<V>>();
  private readonly counters: CacheStats = { hits: 0, misses: 0, evictions: 0 };

  constructor(options: LruOptions) {
    if (!(options.maxEntries >= 1)) throw new RangeError('maxEntries must be at least 1');
    this.max = options.maxEntries;
    this.defaultTtlMs = options.defaultTtlMs;
    this.clock = options.clock ?? Date.now;
  }

  private live(key: string): Entry<V> | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (this.clock() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  get(key: string): V | undefined {
    const entry = this.live(key);
    if (!entry) {
      this.counters.misses++;
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.counters.hits++;
    return entry.value;
  }

  set(key: string, value: V, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const expiresAt = ttl === undefined ? Infinity : this.clock() + ttl;
    if (this.entries.has(key)) {
      this.entries.delete(key);
    } else if (this.entries.size >= this.max) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) {
        this.entries.delete(oldest.value);
        this.counters.evictions++;
      }
    }
    this.entries.set(key, { value, expiresAt });
  }

  has(key: string): boolean {
    const entry = this.entries.get(key);
    return entry !== undefined && this.clock() < entry.expiresAt;
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  get size(): number {
    const now = this.clock();
    for (const [key, entry] of this.entries) if (now >= entry.expiresAt) this.entries.delete(key);
    return this.entries.size;
  }

  stats(): CacheStats {
    return { ...this.counters };
  }
}
