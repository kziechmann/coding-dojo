// Reference solution. Tutor only: never show before hint rung 5.

export interface SearchResult {
  id: string;
  score: number;
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

interface DocStats {
  length: number;
  tf: Map<string, number>;
}

export class Bm25Index {
  private readonly k1: number;
  private readonly b: number;
  private readonly docs = new Map<string, DocStats>();
  private readonly df = new Map<string, number>();
  private totalLength = 0;

  constructor(options: { k1?: number; b?: number } = {}) {
    this.k1 = options.k1 ?? 1.2;
    this.b = options.b ?? 0.75;
  }

  add(id: string, text: string): void {
    if (this.docs.has(id)) throw new Error(`document ${id} already indexed`);
    const tokens = tokenize(text);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    this.docs.set(id, { length: tokens.length, tf });
    this.totalLength += tokens.length;
  }

  search(query: string, k: number): SearchResult[] {
    const n = this.docs.size;
    if (n === 0 || k <= 0) return [];
    const avgdl = this.totalLength / n || 1;
    const terms = [...new Set(tokenize(query))];
    const results: SearchResult[] = [];
    for (const [id, doc] of this.docs) {
      let score = 0;
      for (const t of terms) {
        const tf = doc.tf.get(t);
        if (!tf) continue;
        const nt = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (n - nt + 0.5) / (nt + 0.5));
        score += (idf * tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + (this.b * doc.length) / avgdl));
      }
      if (score > 0) results.push({ id, score });
    }
    results.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return results.slice(0, k);
  }

  get size(): number {
    return this.docs.size;
  }
}

export function recallAtK(results: string[][], relevant: string[][], k: number): number {
  if (results.length !== relevant.length) throw new RangeError('results and relevant must have the same length');
  let sum = 0;
  let counted = 0;
  results.forEach((ranked, i) => {
    const rel = new Set(relevant[i]);
    if (rel.size === 0) return;
    const hits = ranked.slice(0, k).filter((id) => rel.has(id)).length;
    sum += hits / rel.size;
    counted++;
  });
  return counted === 0 ? 0 : sum / counted;
}
