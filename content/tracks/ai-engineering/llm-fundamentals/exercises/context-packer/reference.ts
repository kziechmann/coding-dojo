// Reference solution. Tutor only: never show before hint rung 5.

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
  const available = input.budget - input.reserveForOutput - input.system.tokens - input.question.tokens;
  if (available < 0) throw new RangeError('budget too small for the system prompt, question and output reserve');

  // Stable sort: best score first, ties keep original order.
  const ranked = input.docs.map((doc, index) => ({ doc, index })).sort((a, b) => b.doc.score - a.doc.score || a.index - b.index);
  const chosen = new Set<number>();
  let docTokens = 0;

  const docBudget = Math.floor(available / 2);
  for (const { doc, index } of ranked) {
    if (docTokens + doc.tokens <= docBudget) {
      chosen.add(index);
      docTokens += doc.tokens;
    }
  }

  const kept: Msg[] = [];
  let historyTokens = 0;
  for (let i = input.history.length - 1; i >= 0; i--) {
    const msg = input.history[i]!;
    if (docTokens + historyTokens + msg.tokens > available) break;
    kept.unshift(msg);
    historyTokens += msg.tokens;
  }
  if (kept[0]?.role === 'assistant') historyTokens -= kept.shift()!.tokens;

  for (const { doc, index } of ranked) {
    if (chosen.has(index)) continue;
    if (docTokens + historyTokens + doc.tokens <= available) {
      chosen.add(index);
      docTokens += doc.tokens;
    }
  }

  const docs = ranked.filter((r) => chosen.has(r.index)).map((r) => r.doc);
  return {
    history: kept,
    docs,
    usedTokens: input.system.tokens + input.question.tokens + historyTokens + docTokens,
    droppedHistory: input.history.length - kept.length,
    droppedDocs: input.docs.length - docs.length,
  };
}
