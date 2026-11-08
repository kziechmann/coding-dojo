// Reference solution. Tutor only: never show before hint rung 5.

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type ContentBlock = TextBlock | ToolUseBlock;

export type Message =
  | { role: 'user'; content: string | ToolResultBlock[] }
  | { role: 'assistant'; content: ContentBlock[] };

export interface ModelResponse {
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens';
  content: ContentBlock[];
}

export type Model = (messages: Message[]) => Promise<ModelResponse>;
export type Tool = (input: Record<string, unknown>) => Promise<string> | string;

export interface RunResult {
  text: string;
  messages: Message[];
  turns: number;
  toolCalls: number;
  stopReason: 'end_turn' | 'max_tokens' | 'max_turns';
}

export interface RunOptions {
  model: Model;
  tools: Record<string, Tool>;
  prompt: string;
  maxTurns?: number;
}

const textOf = (content: ContentBlock[]) =>
  content
    .filter((b): b is TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

async function runTool(tools: Record<string, Tool>, call: ToolUseBlock): Promise<ToolResultBlock> {
  const tool = Object.hasOwn(tools, call.name) ? tools[call.name] : undefined;
  if (!tool) return { type: 'tool_result', tool_use_id: call.id, content: `Unknown tool: ${call.name}`, is_error: true };
  try {
    return { type: 'tool_result', tool_use_id: call.id, content: String(await tool(call.input)) };
  } catch (err) {
    return { type: 'tool_result', tool_use_id: call.id, content: err instanceof Error ? err.message : String(err), is_error: true };
  }
}

export async function runAgent(options: RunOptions): Promise<RunResult> {
  const maxTurns = options.maxTurns ?? 10;
  const messages: Message[] = [{ role: 'user', content: options.prompt }];
  let toolCalls = 0;

  for (let turn = 1; ; turn++) {
    const response = await options.model([...messages]);
    messages.push({ role: 'assistant', content: response.content });
    if (response.stop_reason !== 'tool_use') {
      return { text: textOf(response.content), messages, turns: turn, toolCalls, stopReason: response.stop_reason };
    }
    if (turn >= maxTurns) {
      return { text: textOf(response.content), messages, turns: turn, toolCalls, stopReason: 'max_turns' };
    }
    const calls = response.content.filter((b): b is ToolUseBlock => b.type === 'tool_use');
    const results = await Promise.all(calls.map((call) => runTool(options.tools, call)));
    toolCalls += calls.filter((c) => Object.hasOwn(options.tools, c.name)).length;
    messages.push({ role: 'user', content: results });
  }
}
