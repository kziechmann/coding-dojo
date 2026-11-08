import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSolution } from '../../../../../_lib/harness.ts';

const { runAgent } = await loadSolution<typeof import('./starter.ts')>();

type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type Response = { stop_reason: 'end_turn' | 'tool_use' | 'max_tokens'; content: Block[] };

const text = (t: string): Block => ({ type: 'text', text: t });
const use = (id: string, name: string, input: Record<string, unknown> = {}): Block => ({ type: 'tool_use', id, name, input });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Replies from a script; records a deep copy of every conversation it was sent. */
function scripted(responses: Response[]) {
  const seen: unknown[][] = [];
  const model = async (messages: unknown[]) => {
    seen.push(structuredClone(messages));
    const r = responses[seen.length - 1];
    if (!r) throw new Error('the script ran out of responses');
    return r as never;
  };
  return { model, seen };
}

test('returns the answer when no tools are needed', async () => {
  const { model, seen } = scripted([{ stop_reason: 'end_turn', content: [text('Hello!')] }]);
  const r = await runAgent({ model, tools: {}, prompt: 'Hi' });
  assert.equal(r.text, 'Hello!');
  assert.equal(r.stopReason, 'end_turn');
  assert.equal(r.turns, 1);
  assert.equal(r.toolCalls, 0);
  assert.deepEqual(seen[0], [{ role: 'user', content: 'Hi' }]);
});

test('runs a tool and sends its result back with the matching id', async () => {
  const { model, seen } = scripted([
    { stop_reason: 'tool_use', content: [text('Checking.'), use('t1', 'get_score', { match: 1 })] },
    { stop_reason: 'end_turn', content: [text('It was 2-1.')] },
  ]);
  let gotInput: unknown;
  const r = await runAgent({
    model,
    tools: { get_score: async (input) => ((gotInput = input), '2-1') },
    prompt: 'Score of match 1?',
  });
  assert.equal(r.text, 'It was 2-1.');
  assert.deepEqual(gotInput, { match: 1 });
  assert.equal(r.turns, 2);
  assert.equal(r.toolCalls, 1);
  const second = seen[1] as { role: string; content: unknown }[];
  assert.equal(second.length, 3);
  assert.equal(second[1]!.role, 'assistant', 'the assistant tool_use turn must come before the results');
  assert.deepEqual(second[2], { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: '2-1' }] });
});

test('runs parallel tool calls concurrently and returns all results in one message, in order', async () => {
  const { model, seen } = scripted([
    { stop_reason: 'tool_use', content: [use('a', 'slow', { v: 'A' }), use('b', 'slow', { v: 'B' }), use('c', 'fast', { v: 'C' })] },
    { stop_reason: 'end_turn', content: [text('done')] },
  ]);
  const started = Date.now();
  const r = await runAgent({
    model,
    tools: {
      slow: async (i) => (await sleep(80), `slow ${String(i.v)}`),
      fast: async (i) => `fast ${String(i.v)}`,
    },
    prompt: 'go',
  });
  const elapsed = Date.now() - started;
  assert.ok(elapsed < 150, `tools took ${elapsed} ms together; they should run concurrently (~80 ms)`);
  assert.equal(r.toolCalls, 3);
  const results = (seen[1] as { content: unknown }[])[2]!.content as { tool_use_id: string; content: string }[];
  assert.deepEqual(results.map((x) => [x.tool_use_id, x.content]), [
    ['a', 'slow A'],
    ['b', 'slow B'],
    ['c', 'fast C'],
  ]);
});

test('a throwing tool becomes an error result the model can see', async () => {
  const { model, seen } = scripted([
    { stop_reason: 'tool_use', content: [use('t1', 'flaky')] },
    { stop_reason: 'end_turn', content: [text('Sorry, the feed is down.')] },
  ]);
  const r = await runAgent({
    model,
    tools: {
      flaky: async () => {
        throw new Error('feed timeout');
      },
    },
    prompt: 'go',
  });
  assert.equal(r.stopReason, 'end_turn');
  const results = (seen[1] as { content: unknown }[])[2]!.content;
  assert.deepEqual(results, [{ type: 'tool_result', tool_use_id: 't1', content: 'feed timeout', is_error: true }]);
});

test('an unknown tool becomes an error result', async () => {
  const { model, seen } = scripted([
    { stop_reason: 'tool_use', content: [use('t1', 'get_scores')] },
    { stop_reason: 'end_turn', content: [text('ok')] },
  ]);
  const r = await runAgent({ model, tools: { get_score: async () => '1-0' }, prompt: 'go' });
  const results = (seen[1] as { content: unknown }[])[2]!.content;
  assert.deepEqual(results, [{ type: 'tool_result', tool_use_id: 't1', content: 'Unknown tool: get_scores', is_error: true }]);
  assert.equal(r.toolCalls, 0);
});

test('stops at maxTurns without running the last requested tools', async () => {
  const loop: Response = { stop_reason: 'tool_use', content: [text('again'), use('t', 'noop')] };
  const { model, seen } = scripted([loop, loop, loop, loop]);
  let ran = 0;
  const r = await runAgent({ model, tools: { noop: () => (ran++, 'ok') }, prompt: 'go', maxTurns: 3 });
  assert.equal(r.stopReason, 'max_turns');
  assert.equal(r.turns, 3);
  assert.equal(seen.length, 3);
  assert.equal(ran, 2, 'tools from turns 1 and 2 run; turn 3 hit the limit');
  assert.equal(r.toolCalls, 2);
  assert.equal(r.text, 'again');
});

test('passes max_tokens through as the stop reason and joins text blocks', async () => {
  const { model } = scripted([{ stop_reason: 'max_tokens', content: [text('part one'), text('part two')] }]);
  const r = await runAgent({ model, tools: {}, prompt: 'go' });
  assert.equal(r.stopReason, 'max_tokens');
  assert.equal(r.text, 'part one\npart two');
});

test('returns the full conversation', async () => {
  const { model } = scripted([
    { stop_reason: 'tool_use', content: [use('t1', 'x')] },
    { stop_reason: 'end_turn', content: [text('fin')] },
  ]);
  const r = await runAgent({ model, tools: { x: () => 'X' }, prompt: 'go' });
  assert.deepEqual(r.messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant']);
});
