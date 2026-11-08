// Hash ring with virtual nodes. See README.md; run `./dojo test hash-ring`.

/** FNV-1a with a final avalanche step: a fast, well-mixed 32-bit hash. Provided; use it as is. */
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

export class HashRing {
  constructor(options: HashRingOptions = {}) {
    throw new Error('TODO: implement the constructor');
  }

  addNode(node: string): void {
    throw new Error('TODO: implement addNode()');
  }

  removeNode(node: string): void {
    throw new Error('TODO: implement removeNode()');
  }

  getNode(key: string): string | undefined {
    throw new Error('TODO: implement getNode()');
  }

  getNodes(key: string, count: number): string[] {
    throw new Error('TODO: implement getNodes()');
  }

  nodes(): string[] {
    throw new Error('TODO: implement nodes()');
  }
}
