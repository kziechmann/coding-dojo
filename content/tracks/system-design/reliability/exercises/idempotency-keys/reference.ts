// Reference solution. Tutor only: never show before hint rung 5.

export interface Request {
  key: string;
  body: unknown;
}

export interface Response {
  status: number;
  body: unknown;
}

export type Handler = (body: unknown) => Promise<Response>;

export interface IdempotencyOptions {
  ttlMs?: number;
  clock?: () => number;
}

type Record_ =
  | { state: 'running'; fingerprint: string }
  | { state: 'done'; fingerprint: string; response: Response; storedAt: number };

/** JSON with object keys sorted at every depth, so key order never matters. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export class IdempotentHandler {
  private readonly handler: Handler;
  private readonly ttlMs: number;
  private readonly clock: () => number;
  private readonly records = new Map<string, Record_>();

  constructor(handler: Handler, options: IdempotencyOptions = {}) {
    this.handler = handler;
    this.ttlMs = options.ttlMs ?? 24 * 60 * 60 * 1000;
    this.clock = options.clock ?? Date.now;
  }

  async handle(request: Request): Promise<Response> {
    const fingerprint = canonical(request.body);
    let existing = this.records.get(request.key);
    if (existing?.state === 'done' && this.clock() - existing.storedAt >= this.ttlMs) {
      this.records.delete(request.key);
      existing = undefined;
    }
    if (existing) {
      if (existing.fingerprint !== fingerprint) return { status: 422, body: { error: 'idempotency_key_reused' } };
      if (existing.state === 'running') return { status: 409, body: { error: 'request_in_progress' } };
      return existing.response;
    }

    this.records.set(request.key, { state: 'running', fingerprint });
    let response: Response;
    try {
      response = await this.handler(request.body);
    } catch (err) {
      this.records.delete(request.key);
      throw err;
    }
    if (response.status >= 500) this.records.delete(request.key);
    else this.records.set(request.key, { state: 'done', fingerprint, response, storedAt: this.clock() });
    return response;
  }
}
