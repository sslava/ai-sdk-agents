import { describe, it, expect } from 'vitest';
import { getContextPrompt } from '../src/prompt';
import { Context, IRunContext } from '../src/context';

// Define a custom context type for testing
interface TestContext extends Context {
  name?: string;
}

describe('getContextPrompt', () => {
  it('should return the string prompt when a string is provided', () => {
    const prompt = 'Hello, world!';
    const mockContext = {
      inner: {},
      writer: {} as any,
      steps: [],
      history: undefined,
      step: () => mockContext,
      setData: () => {},
    } as IRunContext<TestContext>;

    const result = getContextPrompt(prompt, mockContext);
    expect(result).toBe(prompt);
  });

  it('should execute the function prompt with context and return its result', () => {
    const promptFn = (ctx: TestContext) => `Hello, ${ctx.name || 'world'}!`;
    const mockContext = {
      inner: { name: 'Test' },
      writer: {} as any,
      steps: [],
      history: undefined,
      step: () => mockContext,
      setData: () => {},
    } as IRunContext<TestContext>;

    const result = getContextPrompt(promptFn, mockContext);
    expect(result).toBe('Hello, Test!');
  });

  it('should handle function prompt with empty context', () => {
    const promptFn = (ctx: TestContext) => `Hello, ${ctx.name || 'world'}!`;
    const mockContext = {
      inner: {},
      writer: {} as any,
      steps: [],
      history: undefined,
      step: () => mockContext,
      setData: () => {},
    } as IRunContext<TestContext>;

    const result = getContextPrompt(promptFn, mockContext);
    expect(result).toBe('Hello, world!');
  });
});
