# The agent loop

Strip away the frameworks and an agent is a loop:

1. Send the conversation and a list of tools to the model.
2. If the model replies with text and stops, you're done.
3. If it asks to use tools, run them, append the results, and go to 1.

Everything else (memory, subagents, planning) is built on this. Knowing it cold lets you debug any framework, including the Claude Agent SDK and MCP-based tools.

## The message shapes

A tool request arrives as an assistant message with `tool_use` blocks, each with an `id`, a tool `name` and an `input` object. The model can ask for several tools at once. You reply with **one** user message containing a `tool_result` block per request, each pointing back with `tool_use_id`:

```
assistant: [text "Let me check both.", tool_use {id: t1, name: get_score, input: {match: 1}}, tool_use {id: t2, ...}]
user:      [tool_result {tool_use_id: t1, content: "2-1"}, tool_result {tool_use_id: t2, content: "0-0"}]
```

Splitting results across several user messages, or answering in a different order without ids, is a common bug that confuses the model and teaches it to stop calling tools in parallel.

## Parallel tools

Independent tool calls should run concurrently. Two 2-second API calls take 2 seconds together, not 4. The results still go back in one message, in the order the model asked.

**Predict:** the model requests three tools that take 300 ms, 500 ms and 200 ms. How long does the tool step take run sequentially, and in parallel? (1,000 ms and 500 ms.)

## Errors are information

When a tool throws or the model asks for a tool that doesn't exist, don't crash the loop. Return a `tool_result` with `is_error: true` and a useful message ("Unknown tool: get_scores. Available: get_score, get_schedule"). Models are good at recovering from clear errors: they fix the input or try another tool.

## Limits and guardrails

- **Turn limit:** stop after N model calls and return what you have, so a confused agent can't loop forever.
- **Budget:** cap tokens or cost per task.
- **Permissions:** tools that change the world (send email, run shell, write to production) need allow-lists, confirmations or sandboxes. Read-only tools are safer to run freely.
- **Untrusted results:** a web page a tool fetched can contain instructions aimed at your agent (prompt injection). Treat tool results as data, never as commands.

## Agent or workflow?

If you can write the steps down in advance ("fetch the box score, write a summary, validate, publish"), a **workflow** of fixed steps with LLM calls inside is cheaper, faster and easier to test. Use an **agent** when the path depends on what it finds: debugging, research, open-ended support. Many production systems are workflows with one small agent inside.

## What to say in an interview

Draw the loop, name the message shapes, mention parallel tools, error results, turn limits and permissions, and say when you'd choose a workflow instead.
