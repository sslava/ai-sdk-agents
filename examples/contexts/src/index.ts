import { appendResponseMessages, generateId, Message, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { agent, ChatFlow, Context } from 'ai-sdk-agents';
import { z } from 'zod';

import dotenv from 'dotenv';

dotenv.config();

interface MyContext extends Context {
  today: string;
}

const weatherTool = tool({
  description: 'Get the weather in a location',
  parameters: z.object({
    date: z.string().describe('The date to get the weather for'),
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ date, location }) => ({
    date,
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});

const calendarAgent = agent({
  model: openai('gpt-4o'),
  description: 'He can help you with your calendar related tasks',
  system: (ctx: MyContext) => `Today is ${ctx.today}`,
  output: z.object({
    answer: z.string().describe('The answer to the calendar related task'),
  }),
  asTool: {
    input: z.object({
      question: z.string().describe('Calendar related task'),
    }),
    getPrompt: ({ question }) => ({
      prompt: `Solve the following calendar related task: ${question}`,
    }),
  },
});

const assistantAgent = agent({
  model: openai('gpt-4o'),
  system: 'You are a helpful assistant that can answer questions and help with tasks.',
  maxSteps: 5,
  tools: { calendar: calendarAgent, weather: weatherTool },
});

async function main() {
  const chat = new ChatFlow({ agent: assistantAgent });
  const history: Message[] = [
    {
      role: 'user',
      content: `What was the date of the last full moon?
        And what was the weather this day in Tokyo? And what was the weather that day in Tokyo?`,
      id: generateId(),
    },
  ];
  const context: MyContext = { history, today: new Date().toDateString() };
  const { result } = await chat.run(context);
  const { messages } = await result.response;
  const uimessages = appendResponseMessages({ messages: history, responseMessages: messages });

  console.log(uimessages.map((m) => [m.role, m.content].join(': ')).join('\n'));
}

main();
