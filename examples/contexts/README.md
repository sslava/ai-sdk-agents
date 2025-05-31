# Context Extension Example

This example demonstrates how to extend the context in an agent-based AI system with custom values (such as dates) and inject these values into the system prompt. It also shows how you can use both regular [Vercel AI SDK](https://sdk.vercel.ai/docs) tools and agents as tools within your assistant.

## Key Features

- **Custom Context Injection:**  
  Extend the context object with custom fields (e.g., `today`) and inject them into your agent's system prompt for dynamic, context-aware behavior.

- **Composable Tools:**  
  Use both regular tools (like a weather tool) and other agents (like a calendar agent) as callable tools within your main agent.

- **Flexible Prompting:**  
  System prompts can access custom context values, enabling more personalized and relevant responses.

## How It Works

- The `MyContext` interface extends the base context to include a `today` field.
- The `calendarAgent` uses the `today` value from context in its system prompt.
- The main `assistantAgent` can call both the `calendarAgent` and a regular `weatherTool` as tools.
- The example query demonstrates how the assistant can reason over multiple steps, use both tools, and inject context values into prompts.

## Example

The main script runs a chat flow where the user asks:

> What was the date of the last full moon?  
> And what was the weather this day in Tokyo? And what was the weather that day in Tokyo?

The assistant:

- Uses the calendar agent to answer the date question, injecting today's date into the system prompt.
- Uses the weather tool to fetch weather data for the relevant dates and location.

## Usage

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up your environment:**

   - Copy your OpenAI API key to a `.env` file:
     ```
     OPENAI_API_KEY=your-key-here
     ```

3. **Run the example:**
   ```bash
   pnpm start
   ```

## File Structure

- `src/index.ts` — Main example code.
- `package.json` — Dependencies and scripts.

## Requirements

- Node.js
- pnpm

## Dependencies

- [ai](https://www.npmjs.com/package/ai)
- [ai-sdk-agents](https://www.npmjs.com/package/ai-sdk-agents)
- [@ai-sdk/openai](https://www.npmjs.com/package/@ai-sdk/openai)
- [zod](https://www.npmjs.com/package/zod)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [ts-node](https://www.npmjs.com/package/ts-node) (dev)
- [typescript](https://www.npmjs.com/package/typescript) (dev)
