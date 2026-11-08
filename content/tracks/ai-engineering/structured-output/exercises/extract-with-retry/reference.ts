// Reference solution. Tutor only: never show before hint rung 5.

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type Model = (messages: ChatMessage[]) => Promise<string>;

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };
export type Validator<T> = (value: unknown) => Validation<T>;

export interface ExtractResult<T> {
  value: T;
  attempts: number;
  messages: ChatMessage[];
}

export class ExtractionError extends Error {
  attempts: number;
  lastErrors: string[];

  constructor(message: string, attempts: number, lastErrors: string[]) {
    super(message);
    this.name = 'ExtractionError';
    this.attempts = attempts;
    this.lastErrors = lastErrors;
  }
}

export function parseJsonLoose(text: string): unknown {
  const fence = /```(?:[a-zA-Z]+)?\s*\n?([\s\S]*?)```/.exec(text);
  let candidate: string | undefined = fence?.[1];
  if (candidate === undefined) {
    const obj = text.indexOf('{');
    const arr = text.indexOf('[');
    const starts = [obj, arr].filter((i) => i >= 0);
    if (starts.length === 0) throw new SyntaxError('no JSON object or array found');
    const start = Math.min(...starts);
    const closer = text[start] === '{' ? '}' : ']';
    const end = text.lastIndexOf(closer);
    if (end < start) throw new SyntaxError('unterminated JSON');
    candidate = text.slice(start, end + 1);
  }
  return JSON.parse(candidate.trim());
}

function repairMessage(errors: string[]): string {
  return [
    'Your reply could not be used. Fix these problems:',
    ...errors.map((e) => `- ${e}`),
    'Reply with only the corrected JSON, no other text.',
  ].join('\n');
}

export async function extract<T>(
  model: Model,
  prompt: string,
  validate: Validator<T>,
  options: { maxAttempts?: number } = {},
): Promise<ExtractResult<T>> {
  const maxAttempts = options.maxAttempts ?? 3;
  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
  let errors: string[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const reply = await model([...messages]);
    messages.push({ role: 'assistant', content: reply });
    let parsed: unknown;
    try {
      parsed = parseJsonLoose(reply);
    } catch (err) {
      errors = [`Invalid JSON: ${(err as Error).message}`];
      if (attempt < maxAttempts) messages.push({ role: 'user', content: repairMessage(errors) });
      continue;
    }
    const result = validate(parsed);
    if (result.ok) return { value: result.value, attempts: attempt, messages };
    errors = result.errors;
    if (attempt < maxAttempts) messages.push({ role: 'user', content: repairMessage(errors) });
  }
  throw new ExtractionError(`no valid output after ${maxAttempts} attempts`, maxAttempts, errors);
}
