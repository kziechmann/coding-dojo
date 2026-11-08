// Reference solution. Tutor only: never show before hint rung 5.

export function longestUniqueSubstring(s: string): string {
  const lastSeen = new Map<string, number>();
  let left = 0;
  let bestStart = 0;
  let bestLength = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right]!;
    const seen = lastSeen.get(c);
    if (seen !== undefined && seen >= left) left = seen + 1;
    lastSeen.set(c, right);
    if (right - left + 1 > bestLength) {
      bestLength = right - left + 1;
      bestStart = left;
    }
  }
  return s.slice(bestStart, bestStart + bestLength);
}
