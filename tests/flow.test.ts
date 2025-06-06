import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentFlow } from '../src/flow';
import { Context, IRunContext, RunFlowContext } from '../src/context';
import { LlmAgent } from '../src/agent';
import { ToolParameters } from '../src/tools';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV1 } from 'ai/test';

// Basic flow implementation for testing
class TestFlow<C extends Context, P extends ToolParameters> extends AgentFlow<C> {
  public agent: LlmAgent<C, P>;

  constructor({
    agent,
    onFinish,
  }: {
    agent: LlmAgent<C, P>;
    onFinish?: (event: any, ctx: IRunContext<C>) => Promise<void> | void;
  }) {
    super({ onChatStreamFinish: onFinish });
    this.agent = agent;
  }

  public async run(ctx: C) {
    const context = this.createContext(ctx);
    const result = await this.streamChat(this.agent, context.step());
    return { context, result };
  }

  // Expose protected methods for testing
  public async testStreamChat(agent: LlmAgent<C, P>, ctx: IRunContext<C>) {
    return this.streamChat(agent, ctx);
  }

  public testCreateLlmTool(agent: LlmAgent<C, P>, ctx: IRunContext<C>) {
    return this.createLlmTool(agent, ctx);
  }
}

// Mock Context type for testing
interface TestContext extends Context {
  name?: string;
  data?: Record<string, any>;
}

describe('AgentFlow', () => {
  let flow: TestFlow<TestContext, any>;
  let mockContext: TestContext;
  let mockAgent: LlmAgent<TestContext, any>;
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
      telemetry: {
        functionId: 'test-fn',
      },
    };
    flow = new TestFlow({ agent: mockAgent });
  });

  describe('constructor', () => {
    it('should create a flow with default options', () => {
      const testFlow = new TestFlow({ agent: mockAgent });
      expect(testFlow.agent).toBe(mockAgent);
    });

    it('should create a flow with onFinish callback', () => {
      const onFinish = vi.fn();
      const testFlow = new TestFlow({ agent: mockAgent, onFinish });
      expect(testFlow.agent).toBe(mockAgent);
    });
  });

  describe('run', () => {
    it('should process flow and return context and result', async () => {
      const { context, result } = await flow.run(mockContext);

      expect(context).toBeInstanceOf(RunFlowContext);
      expect(result).toBeDefined();

      await result.consumeStream();
      const steps = await result.steps;

      expect(steps).toEqual([
        expect.objectContaining({
          text: 'Response text',
          stepType: 'initial',
        }),
      ]);
    });
  });

  describe('streamChat', () => {
    it('should stream text with agent configuration', async () => {
      const context = flow.createContext(mockContext);
      const stepContext = context.step();

      const result = await flow.testStreamChat(mockAgent, stepContext);

      expect(result).toBeDefined();
      await result.consumeStream();

      const steps = await result.steps;
      expect(steps).toHaveLength(1);
      expect(steps[0]).toEqual(
        expect.objectContaining({
          text: 'Response text',
          stepType: 'initial',
        })
      );
    });
  });

  describe('createLlmTool', () => {
    it('should throw an error if asTool or description is missing', async () => {
      const context = flow.createContext(mockContext);
      const stepContext = context.step();

      await expect(async () => {
        flow.testCreateLlmTool(mockAgent, stepContext);
      }).rejects.toThrow('asTool and description are required');
    });

    it('should create an LLM tool when configured properly', async () => {
      const agentWithTool = {
        ...mockAgent,
        description: 'Test tool',
        asTool: {
          input: {} as any,
          getPrompt: () => ({ prompt: 'Test prompt' }),
        },
      };

      const context = flow.createContext(mockContext);
      const stepContext = context.step();

      const tool = flow.testCreateLlmTool(agentWithTool, stepContext);

      expect(tool).toBeDefined();
      expect(tool.description).toBe('Test tool');
      expect(tool.execute).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle model errors gracefully', async () => {
      // Setup model to throw an error
      mockModel.doStream = async () => {
        throw new Error('Model error');
      };

      const { result } = await flow.run(mockContext);

      let errorCaught = false;
      for await (const part of result.fullStream) {
        if (part.type === 'error') {
          expect(part.error).toBeDefined();
          errorCaught = true;
        }
      }

      expect(errorCaught).toBe(true);
    });
  });
});
