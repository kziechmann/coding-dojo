// Single flight and a cache-aside loader. See README.md; run `./dojo test single-flight`.

export class SingleFlight<T> {
  do(key: string, fn: () => Promise<T>): Promise<T> {
    throw new Error('TODO: implement do()');
  }

  inFlight(): number {
    throw new Error('TODO: implement inFlight()');
  }
}

export interface LoaderOptions<T> {
  load: (key: string) => Promise<T>;
  ttlMs: number;
  /** Returns the current time in milliseconds. Defaults to Date.now. */
  clock?: () => number;
}

export interface CachedLoader<T> {
  get(key: string): Promise<T>;
  loadCount(): number;
}

export function cachedLoader<T>(options: LoaderOptions<T>): CachedLoader<T> {
  throw new Error('TODO: implement cachedLoader()');
}
