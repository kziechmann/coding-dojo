# Tool-use loop

Implement `runAgent` in `solution.ts`. The message shapes match the Claude Messages API (`tool_use` / `tool_result` blocks); the tests drive it with a scripted fake model.

```ts
const result = await runAgent({
  model,                                   // (messages) => Promise<{ stop_reason, content }>
  tools: { get_score: async ({ match }) => '2-1' },
  prompt: 'What was the score in match 1?',
  maxTurns: 10,
});
result.text;        // the final answer
result.stopReason;  // 'end_turn' | 'max_tokens' | 'max_turns'
```

## Rules

1. Start with `[{ role: 'user', content: prompt }]`.
2. Each turn: call `model(messages)`, then append `{ role: 'assistant', content: response.content }`.
3. If `stop_reason` is `'end_turn'` or `'max_tokens'`, return. `text` is the response's text blocks joined with `'\n'`.
4. If `stop_reason` is `'tool_use'`:
   - Run **every** `tool_use` block **concurrently**.
   - Build one `tool_result` per call, `{ type: 'tool_result', tool_use_id, content }`, in the **same order** as the requests.
   - A tool that throws: `content` is the error's message and `is_error: true`.
   - An unknown tool name: `content` is `Unknown tool: <name>` and `is_error: true`.
   - Append **one** user message holding all the results, then take another turn.
5. If the model asks for tools on turn `maxTurns` (default 10), stop without running them: `stopReason: 'max_turns'`, `text` from that last response.
6. Return `{ text, messages, turns, toolCalls, stopReason }`, where `turns` counts model calls and `toolCalls` counts tools actually run.

**Afterwards:** tell the tutor which tools you would never let this loop run without a human confirming, and why.
