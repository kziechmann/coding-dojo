// Reference solution. Tutor only: never show before hint rung 5.

export interface Chunk {
  id: string;
  docId: string;
  text: string;
  start: number;
  end: number;
}

export function chunkWords(docId: string, text: string, options: { size: number; overlap: number }): Chunk[] {
  const { size, overlap } = options;
  if (!(size >= 1)) throw new RangeError('size must be at least 1');
  if (!(overlap >= 0) || overlap >= size) throw new RangeError('overlap must be in [0, size)');
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: Chunk[] = [];
  const step = size - overlap;
  for (let start = 0; start < words.length; start += step) {
    const end = Math.min(start + size, words.length);
    chunks.push({ id: `${docId}#${chunks.length}`, docId, text: words.slice(start, end).join(' '), start, end });
    if (end === words.length) break;
  }
  return chunks;
}
