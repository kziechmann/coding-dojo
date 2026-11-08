// Idempotency keys. See README.md; run `./dojo test idempotency-keys`.

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
  /** How long stored responses are kept. Defaults to 24 hours. */
  ttlMs?: number;
  /** Returns the current time in milliseconds. Defaults to Date.now. */
  clock?: () => number;
}

export class IdempotentHandler {
  constructor(handler: Handler, options: IdempotencyOptions = {}) {
    throw new Error('TODO: implement the constructor');
  }

  async handle(request: Request): Promise<Response> {
    throw new Error('TODO: implement handle()');
  }
}
