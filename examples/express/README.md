# Express AI Agent Streaming Example

This example demonstrates how to use the [ai-sdk-agents](https://www.npmjs.com/package/ai-sdk-agents) library with an [Express](https://expressjs.com/) server to create a streaming chat API powered by OpenAI, featuring **two agents**: a main assistant agent and a math expert agent used as a tool.

## Features

- Express server with a `/chat` endpoint
- **Streaming chat responses** using Vercel AI SDK and OpenAI
- **Two-agent architecture:**
  - Main assistant agent (general helpful assistant)
  - Math expert agent (used as a tool by the assistant)
- Maintains conversation history in memory
- Written in TypeScript

## Prerequisites

- Node.js v18 or newer
- [npm](https://www.npmjs.com/)
- An OpenAI API key (set as `OPENAI_API_KEY` in your environment)

## Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   # or
   npm install
   ```

2. **Set up environment variables:**

   Create a `.env` file in this directory and add your OpenAI API key:

   ```env
   OPENAI_API_KEY=sk-...
   # Optional: set a custom port
   # PORT=3000
   ```

3. **Run the server:**

   ```bash
   yarn start
   # or
   npm start
   ```

   The server will start on `http://localhost:3000` by default (or the port you set in `.env`).

## Usage

Send a GET request to the `/chat` endpoint with a `q` query parameter containing your message:

```
GET http://localhost:3000/chat?q=What%20is%202+2?
```

The response will be streamed as the AI generates it. If your question involves math, the assistant agent will automatically use the math expert agent as a tool to solve it.

### Example with `curl`:

```bash
curl 'http://localhost:3000/chat?q=What%20is%20the%20square%20root%20of%20144%3F'
```

## How It Works

- **Two agents are defined:**
  - The **math expert agent** specializes in solving math problems and is exposed as a tool.
  - The **assistant agent** is a general-purpose assistant that can use the math agent as a tool when needed.
- The `/chat` endpoint accepts a user query, updates the conversation, and streams the AI's response.
- The response is streamed using `pipeDataStreamToResponse` for real-time output.
- Conversation history is stored in memory for the session (not persisted).

## Project Structure

```
examples/express/
├── src/
│   └── index.ts      # Main Express server and chat logic (with two agents)
├── package.json      # Dependencies and scripts
├── README.md         # This file
└── yarn.lock         # Dependency lockfile
```

## Customization

- Change the system prompt, model, or add more tools/agents in `src/index.ts` to fit your use case.
- Extend the agent with additional tools or more advanced flows using `ai-sdk-agents`.

## Troubleshooting

- Make sure your OpenAI API key is valid and has sufficient quota.
- If you change the port, update the `PORT` variable in your `.env` file.
- For TypeScript issues, ensure you are using a compatible Node.js version and have installed all dev dependencies.

## License

MIT
