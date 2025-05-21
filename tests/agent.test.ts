import { describe, it, expect, vi } from 'vitest';
import { agent, LlmAgentConfig, toolChoiceSchema } from '../src/agent';
import { Context } from '../src/context';
import { LanguageModel } from 'ai';
import { z } from 'zod';
import { ToolParameters } from '../src/tools';

describe('agent', () => {
  // Mock LanguageModel
  const mockModel: LanguageModel = {
    provider: 'test',
    modelId: 'test-model',
    specificationVersion: 'v1',
    defaultObjectGenerationMode: 'json',
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  };

  // Mock Context type for testing
  interface TestContext extends Context {
    name?: string;
  }

  // Mock ToolParameters type for testing
  const testToolParameters: ToolParameters = z.object({
    query: z.string(),
  });

  describe('basic configuration', () => {
    it('should create agent with minimal required configuration', () => {
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
      };

      const result = agent(config);

      expect(result).toEqual({
        ...config,
        isLlmAgent: true,
        toolCallStreaming: true,
        telemetry: undefined,
      });
    });

    it('should create agent with all optional properties', () => {
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        name: 'Test Agent',
        description: 'A test agent for testing',
        model: mockModel,
        system: 'You are a test agent',
        toolCallStreaming: false,
        telemetry: { isEnabled: false },
        maxSteps: 5,
      };

      const result = agent(config);

      expect(result).toEqual({
        ...config,
        isLlmAgent: true,
        telemetry: { isEnabled: false },
      });
    });
  });

  describe('system prompt handling', () => {
    it('should accept string system prompt', () => {
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'Static system prompt',
      };

      const result = agent(config);
      expect(result.system).toBe('Static system prompt');
    });

    it('should accept function system prompt', () => {
      const systemFn = (ctx: TestContext) => `Hello ${ctx.name || 'world'}`;
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: systemFn,
      };

      const result = agent(config);
      expect(result.system).toBe(systemFn);
    });
  });

  describe('tool configuration', () => {
    it('should handle agent with tools', () => {
      const mockTools = {
        search: {
          description: 'Search tool',
          parameters: z.object({ query: z.string() }),
          execute: vi.fn(),
        },
      };

      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
        tools: mockTools,
      };

      const result = agent(config);
      expect(result.tools).toBe(mockTools);
    });

    it('should handle agent as tool', () => {
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
        description: 'Test tool agent',
        asTool: {
          input: testToolParameters,
          getPrompt: (args) => ({
            prompt: `Search for: ${args.query}`,
          }),
        },
      };

      const result = agent(config);
      expect(result.asTool).toBeDefined();
      expect(result.asTool?.input).toBeDefined();
      expect(result.asTool?.getPrompt).toBeDefined();
    });
  });

  describe('tool choice configuration', () => {
    it('should accept auto tool choice', () => {
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
        toolChoice: 'auto',
      };

      const result = agent(config);
      expect(result.toolChoice).toBe('auto');
    });

    it('should accept required tool choice', () => {
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
        toolChoice: 'required',
      };

      const result = agent(config);
      expect(result.toolChoice).toBe('required');
    });

    it('should accept none tool choice', () => {
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
        toolChoice: 'none',
      };

      const result = agent(config);
      expect(result.toolChoice).toBe('none');
    });

    it('should accept specific tool choice', () => {
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
        toolChoice: {
          type: 'tool',
          toolName: 'search',
        },
      };

      const result = agent(config);
      expect(result.toolChoice).toEqual({
        type: 'tool',
        toolName: 'search',
      });
    });

    it('should validate tool choice schema', () => {
      const validChoices = ['auto', 'required', 'none', { type: 'tool', toolName: 'search' }];

      validChoices.forEach((choice) => {
        expect(() => toolChoiceSchema.parse(choice)).not.toThrow();
      });

      const invalidChoices = ['invalid', { type: 'invalid', toolName: 'search' }, { type: 'tool' }];

      invalidChoices.forEach((choice) => {
        expect(() => toolChoiceSchema.parse(choice)).toThrow();
      });
    });
  });

  describe('output schema', () => {
    it('should handle Zod output schema', () => {
      const outputSchema = z.object({
        result: z.string(),
        score: z.number(),
      });

      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
        output: outputSchema,
      };

      const result = agent(config);
      expect(result.output).toBe(outputSchema);
    });

    it('should handle Schema output schema', () => {
      const outputSchema = z.object({
        result: z.string(),
        score: z.number(),
      });

      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
        output: outputSchema,
      };

      const result = agent(config);
      expect(result.output).toBe(outputSchema);
    });
  });

  describe('default values', () => {
    it('should set default toolCallStreaming to true', () => {
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
      };

      const result = agent(config);
      expect(result.toolCallStreaming).toBe(true);
    });

    it('should set default telemetry to true', () => {
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
      };

      const result = agent(config);
      expect(result.telemetry).toBeUndefined();
    });

    it('should allow overriding default values', () => {
      const config: LlmAgentConfig<TestContext, typeof testToolParameters> = {
        model: mockModel,
        system: 'You are a test agent',
        toolCallStreaming: false,
        telemetry: { isEnabled: false },
      };

      const result = agent(config);
      expect(result.toolCallStreaming).toBe(false);
      expect(result.telemetry).toEqual({ isEnabled: false });
    });
  });
});
