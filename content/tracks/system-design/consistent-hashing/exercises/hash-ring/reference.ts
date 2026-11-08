// Reference solution. Tutor only: never show before hint rung 5.

export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export interface HashRingOptions {
  virtualNodes?: number;
}

interface Point {
  hash: number;
  node: string;
}

export class HashRing {
  private readonly vnodes: number;
  private readonly members = new Set<string>();
  private points: Point[] = [];

  constructor(options: HashRingOptions = {}) {
    this.vnodes = options.virtualNodes ?? 100;
  }

  addNode(node: string): void {
    if (this.members.has(node)) return;
    this.members.add(node);
    for (let i = 0; i < this.vnodes; i++) this.points.push({ hash: hash32(`${node}#${i}`), node });
    // Tie-break on node name so the ring never depends on insertion order.
    this.points.sort((a, b) => a.hash - b.hash || (a.node < b.node ? -1 : a.node > b.node ? 1 : 0));
  }

  removeNode(node: string): void {
    if (!this.members.delete(node)) return;
    this.points = this.points.filter((p) => p.node !== node);
  }

  /** Index of the first point with hash >= h, wrapping to 0. */
  private startIndex(h: number): number {
    let lo = 0;
    let hi = this.points.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.points[mid]!.hash < h) lo = mid + 1;
      else hi = mid;
    }
    return lo === this.points.length ? 0 : lo;
  }

  getNode(key: string): string | undefined {
    if (this.points.length === 0) return undefined;
    return this.points[this.startIndex(hash32(key))]!.node;
  }

  getNodes(key: string, count: number): string[] {
    const want = Math.min(count, this.members.size);
    const found: string[] = [];
    if (want <= 0) return found;
    const start = this.startIndex(hash32(key));
    for (let i = 0; i < this.points.length && found.length < want; i++) {
      const node = this.points[(start + i) % this.points.length]!.node;
      if (!found.includes(node)) found.push(node);
    }
    return found;
  }

  nodes(): string[] {
    return [...this.members].sort();
  }
}
