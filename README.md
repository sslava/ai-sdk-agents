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
import { agent } from 'ai-sdk-simple-agents';
import { ChatFlow } from 'ai-sdk-simple-agents/flows/chat-flow';

const myAgent = agent({
  // Your agent configuration
});

const flow = new ChatFlow({ agent: myAgent });
const { context, result } = await flow.run({
  // Your input context
});
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
   pnpm install
   ```

### Available Scripts

- `pnpm test` - Run tests using Vitest
- `pnpm lint` - Run ESLint with auto-fix
- `pnpm format` - Format code using Prettier


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
- Uses [Vitest](https://vitest.dev/) for testing

#TODO:
- [ ] Add more tests
- [ ] Add more examples
- [ ] Add more documentation
- [ ] Inter-Agent memory