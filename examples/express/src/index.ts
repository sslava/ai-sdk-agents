import express from 'express';
import dotenv from 'dotenv';

import { appendResponseMessages, generateId, Message, pipeDataStreamToResponse } from 'ai';
import { openai } from '@ai-sdk/openai';

import { agent, ChatFlow } from 'ai-sdk-agents';
import { z } from 'zod';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

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
});

let conversation: Message[] = [];

app.get('/chat', async (req, res) => {
  const query = req.query.q as string;

  conversation.push({ role: 'user', content: query, id: generateId() });

  pipeDataStreamToResponse(res, {
    execute: async (dataStream) => {
      const context = { dataStream, history: conversation };

      const chat = new ChatFlow({
        agent: assistantAgent,
        onFinish: async ({ response }, ctx) => {
          conversation = appendResponseMessages({
            messages: ctx.history ?? [],
            responseMessages: response.messages,
          });
        },
      });
      await chat.run(context);
    },
    onError(error) {
      console.error('Error streaming response', { error });
      return error instanceof Error ? error.message : String(error);
    },
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
