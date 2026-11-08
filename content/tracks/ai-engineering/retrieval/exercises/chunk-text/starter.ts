// Chunk text with overlap. See README.md; run `./dojo test chunk-text`.

export interface Chunk {
  id: string;
  docId: string;
  text: string;
  /** Index of the first word (inclusive). */
  start: number;
  /** Index after the last word (exclusive). */
  end: number;
}

export function chunkWords(docId: string, text: string, options: { size: number; overlap: number }): Chunk[] {
  throw new Error('TODO: implement chunkWords()');
}
