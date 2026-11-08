// Context packer. See README.md; run `./dojo test context-packer`.

export interface Msg {
  role: 'user' | 'assistant';
  text: string;
  tokens: number;
}

export interface Doc {
  id: string;
  text: string;
  tokens: number;
  score: number;
}

export interface PackInput {
  system: { text: string; tokens: number };
  /** Oldest first. */
  history: Msg[];
  question: Msg;
  docs: Doc[];
  budget: number;
  reserveForOutput: number;
}

export interface Packed {
  history: Msg[];
  docs: Doc[];
  usedTokens: number;
  droppedHistory: number;
  droppedDocs: number;
}

export function pack(input: PackInput): Packed {
  throw new Error('TODO: implement pack()');
}
