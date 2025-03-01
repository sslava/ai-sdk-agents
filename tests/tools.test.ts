import { describe, it, expect, vi } from 'vitest';
import { Tool } from 'ai';
import { z } from 'zod';
import { ToolParameters, inferParameters, GenericToolSet, IToolFactory } from '../src/tools';
import { Context, IRunContext } from '../src/context';
import { LlmAgent } from '../src/agent';

describe('tools', () => {
  // Mock Context type for testing
  interface TestContext extends Context {
    name?: string;
  }

  // Mock RunContext for testing
  const mockRunContext: IRunContext<TestContext> = {
    steps: [],
    writer: {} as any,
    inner: { name: 'test' },
    history: [],
    step: vi.fn(),
    setData: vi.fn(),
  };

  // Type guards for tool entries
  const isTool = (entry: any): entry is Tool => {
    return 'description' in entry && 'parameters' in entry && 'execute' in entry;
  };

  const isLlmAgent = (entry: any): entry is LlmAgent<TestContext, any> => {
    return 'isLlmAgent' in entry && entry.isLlmAgent === true;
  };

  const isToolFactory = (entry: any): entry is IToolFactory<TestContext> => {
    return 'createTool' in entry && typeof entry.createTool === 'function';
  };

  describe('ToolParameters', () => {
    it('should work with Zod schema', () => {
      const _zodSchema: ToolParameters = z.object({
        query: z.string(),
        limit: z.number().optional(),
      });

      expect(_zodSchema).toBeDefined();
      expect(_zodSchema instanceof z.ZodType).toBe(true);
    });

    it('should work with Schema type', () => {
      const _schema: ToolParameters = z.object({
        query: z.string(),
        limit: z.number().optional(),
      });

      expect(_schema).toBeDefined();
      expect(_schema instanceof z.ZodType).toBe(true);
    });
  });

  describe('inferParameters', () => {
    it('should infer types from Zod schema', () => {
      const _zodSchema = z.object({
        query: z.string(),
        limit: z.number().optional(),
      });

      type InferredType = inferParameters<typeof _zodSchema>;
      const test: InferredType = {
        query: 'test',
        limit: 10,
      };

      expect(test).toEqual({
        query: 'test',
        limit: 10,
      });
    });

    it('should infer types from Schema type', () => {
      const _schema = z.object({
        query: z.string(),
        limit: z.number().optional(),
      });

      type InferredType = inferParameters<typeof _schema>;
      const test: InferredType = {
        query: 'test',
        limit: 10,
      };

      expect(test).toEqual({
        query: 'test',
        limit: 10,
      });
    });
  });

  describe('ToolEntry', () => {
    it('should accept Tool type', () => {
      const tool: Tool = {
        description: 'Test tool',
        parameters: z.object({ query: z.string() }),
        execute: vi.fn(),
      };

      expect(tool.description).toBe('Test tool');
      expect(tool.execute).toBeDefined();
    });

    it('should accept LlmAgent type', () => {
      const agent: LlmAgent<TestContext, any> = {
        isLlmAgent: true,
        model: {
          provider: 'test',
          modelId: 'test-model',
          specificationVersion: 'v1',
          defaultObjectGenerationMode: 'json',
          doGenerate: vi.fn(),
          doStream: vi.fn(),
        },
        system: 'Test system',
      };

      expect(agent.isLlmAgent).toBe(true);
      expect(agent.model).toBeDefined();
    });

    it('should accept IToolFactory type', () => {
      const factory: IToolFactory<TestContext> = {
        createTool: (_ctx: IRunContext<TestContext>) => ({
          description: 'Factory tool',
          parameters: z.object({ query: z.string() }),
          execute: vi.fn(),
        }),
      };

      const tool = factory.createTool(mockRunContext);
      expect(tool.description).toBe('Factory tool');
      expect(tool.execute).toBeDefined();
    });
  });

  describe('GenericToolSet', () => {
    it('should create a record of tool entries', () => {
      const searchTool: Tool = {
        description: 'Search tool',
        parameters: z.object({ query: z.string() }),
        execute: vi.fn(),
      };

      const analyzeTool: Tool = {
        description: 'Analysis tool',
        parameters: z.object({ text: z.string() }),
        execute: vi.fn(),
      };

      const toolSet: GenericToolSet<TestContext> = {
        search: searchTool,
        analyze: analyzeTool,
      };

      expect(Object.keys(toolSet)).toHaveLength(2);
      const searchEntry = toolSet.search;
      const analyzeEntry = toolSet.analyze;

      expect(isTool(searchEntry)).toBe(true);
      expect(isTool(analyzeEntry)).toBe(true);
      if (isTool(searchEntry)) {
        expect(searchEntry.description).toBe('Search tool');
      }
      if (isTool(analyzeEntry)) {
        expect(analyzeEntry.description).toBe('Analysis tool');
      }
    });

    it('should support mixed tool types', () => {
      const searchTool: Tool = {
        description: 'Search tool',
        parameters: z.object({ query: z.string() }),
        execute: vi.fn(),
      };

      const agentTool: LlmAgent<TestContext, any> = {
        isLlmAgent: true,
        model: {
          provider: 'test',
          modelId: 'test-model',
          specificationVersion: 'v1',
          defaultObjectGenerationMode: 'json',
          doGenerate: vi.fn(),
          doStream: vi.fn(),
        },
        system: 'Test system',
      };

      const factoryTool: IToolFactory<TestContext> = {
        createTool: (_ctx: IRunContext<TestContext>) => ({
          description: 'Factory tool',
          parameters: z.object({ query: z.string() }),
          execute: vi.fn(),
        }),
      };

      const toolSet: GenericToolSet<TestContext> = {
        search: searchTool,
        agent: agentTool,
        factory: factoryTool,
      };

      expect(Object.keys(toolSet)).toHaveLength(3);
      const searchEntry = toolSet.search;
      const agentEntry = toolSet.agent;
      const factoryEntry = toolSet.factory;

      expect(isTool(searchEntry)).toBe(true);
      expect(isLlmAgent(agentEntry)).toBe(true);
      expect(isToolFactory(factoryEntry)).toBe(true);

      if (isTool(searchEntry)) {
        expect(searchEntry.description).toBe('Search tool');
      }
      if (isLlmAgent(agentEntry)) {
        expect(agentEntry.isLlmAgent).toBe(true);
      }
      if (isToolFactory(factoryEntry)) {
        expect(factoryEntry.createTool).toBeDefined();
      }
    });
  });

  describe('IToolFactory', () => {
    it('should create tools with context', () => {
      const factory: IToolFactory<TestContext> = {
        createTool: (_ctx: IRunContext<TestContext>) => ({
          description: 'Context-aware tool',
          parameters: z.object({ query: z.string() }),
          execute: vi.fn(),
        }),
      };

      const tool = factory.createTool(mockRunContext);
      expect(tool.description).toBe('Context-aware tool');
      expect(tool.execute).toBeDefined();
    });

    it('should create different tools for different contexts', () => {
      const factory: IToolFactory<TestContext> = {
        createTool: (ctx: IRunContext<TestContext>) => ({
          description: `Tool for ${ctx.inner.name}`,
          parameters: z.object({ query: z.string() }),
          execute: vi.fn(),
        }),
      };

      const tool1 = factory.createTool(mockRunContext);
      const tool2 = factory.createTool({
        ...mockRunContext,
        inner: { name: 'different' },
      });

      expect(tool1.description).toBe('Tool for test');
      expect(tool2.description).toBe('Tool for different');
    });
  });
});
