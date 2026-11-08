import { pathToFileURL } from 'node:url';

/**
 * Exercise tests import the implementation through this helper, so the same
 * tests run against the learner's workspace file, the starter, or the
 * reference. `./dojo test` sets DOJO_SOLUTION.
 */
export async function loadSolution<T>(): Promise<T> {
  const path = process.env.DOJO_SOLUTION;
  if (!path) throw new Error('DOJO_SOLUTION is not set. Run the tests with `./dojo test <exercise>`.');
  return (await import(pathToFileURL(path).href)) as T;
}

/** A controllable clock for time-based exercises. */
export function fakeClock(startMs = 0): { now: () => number; advance: (ms: number) => void; set: (ms: number) => void } {
  let t = startMs;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
    set: (ms: number) => {
      t = ms;
    },
  };
}
