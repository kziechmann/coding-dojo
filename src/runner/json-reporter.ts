// A node:test reporter that prints one JSON object per line, so the runner
// can parse results without scraping human-readable output.
// Usage: node --test --test-reporter=./src/runner/json-reporter.ts <files>

interface TestEventData {
  name?: string;
  nesting?: number;
  file?: string;
  message?: string;
  details?: { type?: string; duration_ms?: number; error?: unknown };
}

interface TestEvent {
  type: string;
  data: TestEventData;
}

function errorMessage(err: unknown): string {
  if (err === null || err === undefined) return '';
  const e = err as { cause?: unknown; message?: unknown; code?: unknown };
  const inner = e.cause !== undefined && e.cause !== null ? e.cause : err;
  const msg = (inner as { message?: unknown }).message ?? inner;
  return String(msg).slice(0, 2000);
}

export default async function* jsonReporter(source: AsyncIterable<TestEvent>): AsyncGenerator<string> {
  for await (const event of source) {
    const { type, data } = event;
    if (type === 'test:pass' || type === 'test:fail') {
      yield `${JSON.stringify({
        event: type === 'test:pass' ? 'pass' : 'fail',
        name: data.name,
        nesting: data.nesting,
        file: data.file,
        kind: data.details?.type,
        durationMs: data.details?.duration_ms,
        error: type === 'test:fail' ? errorMessage(data.details?.error) : undefined,
      })}\n`;
    } else if (type === 'test:stdout' || type === 'test:stderr') {
      yield `${JSON.stringify({ event: 'output', text: data.message ?? '' })}\n`;
    }
  }
}
