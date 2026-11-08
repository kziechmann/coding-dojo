// Extract with a repair loop. See README.md; run `./dojo test extract-with-retry`.

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Anything that turns a conversation into a reply: a real API client or a test fake. */
export type Model = (messages: ChatMessage[]) => Promise<string>;

export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };
export type Validator<T> = (value: unknown) => Validation<T>;

export interface ExtractResult<T> {
  value: T;
  attempts: number;
  messages: ChatMessage[];
}

/** Provided: thrown when every attempt fails. */
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
  throw new Error('TODO: implement parseJsonLoose()');
}

export async function extract<T>(
  model: Model,
  prompt: string,
  validate: Validator<T>,
  options: { maxAttempts?: number } = {},
): Promise<ExtractResult<T>> {
  throw new Error('TODO: implement extract()');
}
