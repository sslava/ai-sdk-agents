import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatFlow } from '../../src/flows/chat-flow';
import { Context } from '../../src/context';
import { LlmAgent } from '../../src/agent';
import { Message as AIMessage } from 'ai';
import { z } from 'zod';

import { simulateReadableStream } from 'ai';
import { MockLanguageModelV1 } from 'ai/test';

// Mock Context type for testing
interface TestContext extends Context {
  name?: string;
  data?: Record<string, any>;
}

// Mock ToolParameters type for testing
type TestToolParameters = z.ZodObject<{
  query: z.ZodString;
}>;

describe('ChatFlow', () => {
  let flow: ChatFlow<TestContext, TestToolParameters>;
  let mockContext: TestContext;
  let mockAgent: LlmAgent<TestContext, TestToolParameters>;
  let mockModel: MockLanguageModelV1;

  beforeEach(() => {
    mockContext = {
      name: 'test',
      history: [{ role: 'user', content: 'Test message', id: '1' }],
    };
    mockModel = new MockLanguageModelV1({
      provider: 'test',
      modelId: 'test-model',
      defaultObjectGenerationMode: 'json',
      doStream: async (options) => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-delta', textDelta: 'Response text' },
            {
              type: 'finish',
              finishReason: 'stop',
              usage: { promptTokens: 10, completionTokens: 20 },
            },
          ],
        }),
        rawCall: { rawPrompt: options.prompt, rawSettings: {} },
      }),
    });
    mockAgent = {
      model: mockModel,
      system: 'You are a test agent',
      isLlmAgent: true,
      toolCallStreaming: true,
      telemetry: true,
    };
    flow = new ChatFlow({ agent: mockAgent });
  });

  describe('run', () => {
    it('should process chat without history', async () => {
      const { result } = await flow.run(mockContext);
      await result.consumeStream();
      const steps = await result.steps;
      expect(steps).toEqual([
        expect.objectContaining({
          text: 'Response text',
          stepType: 'initial',
        }),
      ]);
    });

    it('should process chat with history', async () => {
      const history: AIMessage[] = [
        { role: 'user', content: 'Hello', id: '1' },
        { role: 'assistant', content: 'Hi there!', id: '2' },
      ];

      const contextWithHistory = { ...mockContext, history };

      const { context, result } = await flow.run(contextWithHistory);
      await result.consumeStream();
      const steps = await result.steps;
      expect(steps).toEqual([
        expect.objectContaining({
          text: 'Response text',
          stepType: 'initial',
        }),
      ]);
      expect(context.history).toEqual(history);
    });

    it('should process chat with tools', async () => {
      const tools = {
        search: {
          description: 'Search tool',
          parameters: z.object({ query: z.string() }),
          execute: vi.fn().mockResolvedValue({ result: 'Search result' }),
        },
      };

      mockAgent.tools = tools;
      mockModel.doStream = async (options) => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-delta', textDelta: 'Tool execution result' },
            {
              type: 'finish',
              finishReason: 'stop',
              usage: { promptTokens: 10, completionTokens: 20 },
            },
          ],
        }),
        rawCall: { rawPrompt: options.prompt, rawSettings: {} },
      });

      const { result } = await flow.run(mockContext);
      await result.consumeStream();
      const steps = await result.steps;
      expect(steps).toEqual([
        expect.objectContaining({
          text: 'Tool execution result',
          stepType: 'initial',
        }),
      ]);
    });

    it('should call onFinish callback when provided', async () => {
      const onFinish = vi.fn();
      const flowWithCallback = new ChatFlow({ agent: mockAgent, onFinish });

      const { result } = await flowWithCallback.run(mockContext);
      await result.consumeStream();
      await result.steps;

      expect(onFinish).toHaveBeenCalled();
    });

    it('should handle stream errors properly', async () => {
      const error = new Error('Test error');
      mockModel.doStream = async () => {
        throw error;
      };

      let errorCaught = false;
      const { result } = await flow.run(mockContext);

      for await (const part of result.fullStream) {
        if (part.type === 'error') {
          const streamError = part.error as Error;
          expect(streamError.message).toBe(error.message);
          errorCaught = true;
        }
      }

      expect(errorCaught).toBe(true);
    });

    it('should handle unknown errors properly', async () => {
      const error = new Error('Unknown error occurred');
      mockModel.doStream = async () => {
        throw error;
      };

      let errorCaught = false;
      const { result } = await flow.run(mockContext);

      for await (const part of result.fullStream) {
        if (part.type === 'error') {
          const streamError = part.error as Error;
          expect(streamError.message).toBe(error.message);
          errorCaught = true;
        }
      }

      expect(errorCaught).toBe(true);
    });
  });
});
