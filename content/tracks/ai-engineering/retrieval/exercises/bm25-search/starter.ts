// BM25 search and recall@k. See README.md; run `./dojo test bm25-search`.

export interface SearchResult {
  id: string;
  score: number;
}

export function tokenize(text: string): string[] {
  throw new Error('TODO: implement tokenize()');
}

export class Bm25Index {
  constructor(options: { k1?: number; b?: number } = {}) {
    throw new Error('TODO: implement the constructor');
  }

  add(id: string, text: string): void {
    throw new Error('TODO: implement add()');
  }

  search(query: string, k: number): SearchResult[] {
    throw new Error('TODO: implement search()');
  }

  get size(): number {
    throw new Error('TODO: implement size');
  }
}

export function recallAtK(results: string[][], relevant: string[][], k: number): number {
  throw new Error('TODO: implement recallAtK()');
}
