# AI SDK Agents

[![NPM version](https://img.shields.io/npm/v/ai-sdk-agents.svg)](https://npmjs.org/package/ai-sdk-agents) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/facebook/react/blob/main/LICENSE) [![Actions Status](https://github.com/sslava/ai-sdk-agents/workflows/release/badge.svg)](https://github.com/sslava/ai-sdk-agents/actions)

AI SDK Agents is an extension of the standard [Vercel AI SDK](https://sdk.vercel.ai/docs) API. It enables you to build advanced generative applications using patterns and agent compositions that are not supported by the Vercel AI SDK out of the box. With this library, you can define your own agents, compose them together, and call agents as tools within other agents, unlocking complex reasoning and orchestration flows.

## Features

- 🚀 Extends the Vercel AI SDK API to support new generative app patterns
- 🤖 Define and compose agents (agents can call each other as tools)
- 🔄 Flexible flow and step management
- 🛠️ Extensible tool system
- 📝 Context and memory between steps
- 🔄 Streaming response support

## Installation

```bash
npm install ai-sdk-agents
# or
yarn add ai-sdk-agents
# or
pnpm add ai-sdk-agents
```

## Prerequisites

This package requires the Vercel AI SDK and zod as a peer dependency:

```bash
npm install ai zod
# or
yarn add ai zod
# or
pnpm add ai zod
```

## Usage

Here's a basic example of how to use the library:

```typescript
import { z } from 'zod';
import { generateId } from 'ai';
import { openai } from '@ai-sdk/openai';
import { agent, ChatFlow } from 'ai-sdk-agents';

// Math expert agent, exposed as a tool
const mathAgent = agent({
  model: openai('gpt-4o'),
  description: 'Math expert that can answer questions and help with tasks.',
  system: 'You are a math expert that can answer questions and help with tasks.',
  output: z.object({
    answer: z.string().describe('The answer to the math problem'),
  }),
  asTool: {
    input: z.object({
      question: z.string().describe('The math problem to solve'),
    }),
    getPrompt: ({ question }) => ({
      prompt: `Solve the following math problem: ${question}`,
    }),
  },
});

const assistantAgent = agent({
  model: openai('gpt-4o'),
  system: 'You are a helpful assistant that can answer questions and help with tasks.',
  tools: { math: mathAgent },
  maxSteps: 5,
  toolChoice: 'auto',
});

const chat = new ChatFlow({ agent: assistantAgent });
const context = { history: [{ role: 'user', content: 'What is the square root of 144?' }] };
const { result } = await chat.run(context);
const { messages } = await result.response;

console.log(messages);
```

This example demonstrates how to build a streaming chat API where the assistant agent can automatically use the math agent as a tool to solve math problems in user queries. The response is streamed in real time to the client.

### Other examples

- [**examples/contexts**](examples/contexts)  
  _Demonstrates how to extend the agent context with custom values (like dates) and inject them into system prompts. Shows how to use both regular tools and other agents as tools within your assistant, enabling dynamic, context-aware behavior and multi-step reasoning._

- [**examples/express**](examples/express)  
  _Shows how to build a streaming chat API using Express, powered by two agents: a main assistant and a math expert agent (used as a tool). Features real-time streaming responses, conversation history, and a `/chat` endpoint for interactive queries._

## Project Structure

```
src/
├── agent.ts           # Core agent implementation
├── context.ts         # Context management
├── flow.ts            # Flow control and management
├── flows/             # Predefined flow implementations
│   └── chat-flow.ts   # Chat flow implementation
├── index.ts           # Main entry point
├── tools.ts           # Tool definitions
└── prompt.ts          # Prompt handling
```

## Development

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Available Scripts

- `pnpm test` - Run tests using Vitest
- `pnpm lint:fix` - Run ESLint with auto-fix
- `pnpm format` - Format code with Prettier

### Examples

Example projects are located in the `examples/` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Built on top of the [Vercel AI SDK](https://sdk.vercel.ai/docs)
- Heavily inspired by [openai agent framework](https://github.com/openai/openai-agents-python)
- Uses [Vitest](https://vitest.dev/) for testing
- Inspired by [Anthropic's "Building effective agents"](https://www.anthropic.com/engineering/building-effective-agents) for agentic patterns and best practices

## TODO

- [ ] Add next.js examples
 - [ ] Document public API and use cases
- [ ] Inter-Agent memory
