# AI SDK Simple Agents

A powerful and flexible library for building AI agents using the Vercel AI SDK. This project provides a simple yet powerful way to create and manage AI agents with customizable flows, tools, and contexts.

## Features

- 🤖 Simple agent creation and management
- 🔄 Customizable agent flows
- 🛠️ Extensible tool system
- 📝 Context management
- 🔄 Streaming support

## Installation

```bash
npm install ai-sdk-simple-agents
# or
yarn add ai-sdk-simple-agents
# or
pnpm add ai-sdk-simple-agents
```

## Prerequisites

This package requires the Vercel AI SDK and zod as a peer dependency:

```bash
npm install ai
# or
yarn add ai
# or
pnpm add ai
```

## Usage

Here's a basic example of how to use the library:

```typescript


import { agent, ChatFlow, Context } from 'ai-sdk-simple-agents';
import { openai } from '@ai-sdk/openai';

export type PlannerContext = Context & {
  today: string;
};

const sqlAgent = agent({
  model: openai('gpt-4o'),
  system: (ctx: PlannerContext) => plannerPrompt(ctx.today),
  description: "This agent can help you write SQL queries",
  tools: { sqlExecutor: sqlExecutorTool },
  asTool: {
  input: z.object({
    question: z.string().describe('The user query to analyze'),
  }),
  getPrompt: ({ question, }) => ({
    prompt: `question: ${question}.
      - Make sure you return no more than 200 rows of data.`,
    }),  
  },
});

export const routerAgent = agent({
  system: (ctx: InsightContext) => routerPrompt(ctx),
  model: openai('gpt-4o'),
  maxSteps: 5,
  tools: { sqlAgent },
  toolChoice: 'auto',
});

const flow = new ChatFlow({ agent: routerAgent });
const ctx = { history: [],today: new Date().toISOString().split('T')[0] };
const { result } = await flow.run(ctx);

```

## Project Structure

```
src/
├── agent.ts      # Core agent implementation
├── context.ts    # Context management
├── flow.ts       # Flow control and management
├── flows/        # Predefined flow implementations
│   └── chat-flow.ts # Chat flow implementation
├── index.ts      # Main entry point
├── prompt.ts     # Prompt handling
├── stream.ts     # Streaming functionality
└── tools.ts      # Tool definitions
```

## Development

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```

### Available Scripts

- `yarn test` - Run tests using Vitest
- `yarn lint` - Run ESLint with auto-fix
- `yarn format` - Format code using Prettier


### Tests

Comprehensive tests are located in the `tests/` directory.

### Examples

Example projects are located in the `examples/` directory. (Note: If the directory is currently named `exmaples/`, please rename it to `examples/`.)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.


## Acknowledgments

- Built on top of the [Vercel AI SDK](https://sdk.vercel.ai/docs)
- Heavily inspired by (openai agent framework)[https://github.com/openai/openai-agents-python]
- Uses [Vitest](https://vitest.dev/) for testing

#TODO:
- [ ] Add more tests
- [ ] Add more examples
- [ ] Add more documentation
- [ ] Inter-Agent memory