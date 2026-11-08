// Reference solution. Tutor only: never show before hint rung 5.

export function groupAnagrams(words: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const word of words) {
    const key = [...word].sort().join('');
    const group = groups.get(key);
    if (group) group.push(word);
    else groups.set(key, [word]);
  }
  return [...groups.values()];
}
