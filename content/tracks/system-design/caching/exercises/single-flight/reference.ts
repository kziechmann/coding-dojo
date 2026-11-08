// Reference solution. Tutor only: never show before hint rung 5.

export class SingleFlight<T> {
  private readonly calls = new Map<string, Promise<T>>();

  do(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.calls.get(key);
    if (existing) return existing;
    let promise: Promise<T>;
    try {
      promise = fn();
    } catch (err) {
      promise = Promise.reject(err);
    }
    const tracked = promise.finally(() => {
      if (this.calls.get(key) === tracked) this.calls.delete(key);
    });
    this.calls.set(key, tracked);
    return tracked;
  }

  inFlight(): number {
    return this.calls.size;
  }
}

export interface LoaderOptions<T> {
  load: (key: string) => Promise<T>;
  ttlMs: number;
  clock?: () => number;
}

export interface CachedLoader<T> {
  get(key: string): Promise<T>;
  loadCount(): number;
}

export function cachedLoader<T>(options: LoaderOptions<T>): CachedLoader<T> {
  const clock = options.clock ?? Date.now;
  const cache = new Map<string, { value: T; at: number }>();
  const flight = new SingleFlight<T>();
  let loads = 0;

  return {
    async get(key: string): Promise<T> {
      const hit = cache.get(key);
      if (hit && clock() - hit.at < options.ttlMs) return hit.value;
      return flight.do(key, async () => {
        loads++;
        const value = await options.load(key);
        cache.set(key, { value, at: clock() });
        return value;
      });
    },
    loadCount: () => loads,
  };
}
