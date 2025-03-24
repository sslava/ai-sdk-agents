import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunFlowContext, Context, IRunContext } from '../src/context';
import { VercelStreamWriter } from '../src/stream';
import { DataStreamWriter } from 'ai';

describe('RunFlowContext', () => {
  let mockStream: DataStreamWriter;
  let mockWrite: ReturnType<typeof vi.fn>;
  let context: Context;
  let runFlowContext: RunFlowContext<Context>;

  beforeEach(() => {
    mockWrite = vi.fn();
    mockStream = {
      write: mockWrite,
    } as unknown as DataStreamWriter;

    context = {
      dataStream: mockStream,
      history: [
        { role: 'user', content: 'Hello', id: 'msg1' },
        { role: 'assistant', content: 'Hi', id: 'msg2' },
      ],
    };

    runFlowContext = new RunFlowContext(context);
  });

  describe('initialization', () => {
    it('should initialize with provided context', () => {
      expect(runFlowContext.inner).toBe(context);
      expect(runFlowContext.writer).toBeInstanceOf(VercelStreamWriter);
      expect(runFlowContext.steps).toEqual([]);
      expect(runFlowContext.messages).toEqual([]);
      expect(runFlowContext.responseMessages).toEqual([]);
    });

    it('should initialize without dataStream', () => {
      const contextWithoutStream = { ...context, dataStream: undefined };
      const ctx = new RunFlowContext(contextWithoutStream);
      expect(ctx.writer).toBeInstanceOf(VercelStreamWriter);
    });
  });

  describe('history', () => {
    it('should return history from inner context', () => {
      expect(runFlowContext.history).toEqual(context.history);
    });

    it('should return undefined when history is not provided', () => {
      const contextWithoutHistory = { ...context, history: undefined };
      const ctx = new RunFlowContext(contextWithoutHistory);
      expect(ctx.history).toBeUndefined();
    });
  });

  describe('step', () => {
    it('should create a new step context', () => {
      const step = runFlowContext.step();
      expect(step).toBeInstanceOf(Object);
      expect(runFlowContext.steps).toHaveLength(1);
      expect(runFlowContext.steps[0]).toBe(step);
    });

    it('should create multiple steps', () => {
      const step1 = runFlowContext.step();
      const step2 = runFlowContext.step();
      const step3 = runFlowContext.step();

      expect(runFlowContext.steps).toHaveLength(3);
      expect(runFlowContext.steps).toEqual([step1, step2, step3]);
    });
  });

  describe('setData', () => {
    it('should be a no-op in RunFlowContext', () => {
      const data = { test: 'value' };
      runFlowContext.setData(data);
      // No assertion needed as it's a no-op
    });
  });
});

describe('RunStepContext', () => {
  let mockStream: DataStreamWriter;
  let mockWrite: ReturnType<typeof vi.fn>;
  let context: Context;
  let runFlowContext: RunFlowContext<Context>;
  let runStepContext: IRunContext<Context>;

  beforeEach(() => {
    mockWrite = vi.fn();
    mockStream = {
      write: mockWrite,
    } as unknown as DataStreamWriter;

    context = {
      dataStream: mockStream,
      history: [
        { role: 'user', content: 'Hello', id: 'msg1' },
        { role: 'assistant', content: 'Hi', id: 'msg2' },
      ],
    };

    runFlowContext = new RunFlowContext(context);
    runStepContext = runFlowContext.step();
  });

  describe('initialization', () => {
    it('should initialize with parent context', () => {
      expect(runStepContext.inner).toBe(context);
      expect(runStepContext.writer).toBe(runFlowContext.writer);
      expect(runStepContext.steps).toEqual([]);
    });
  });

  describe('history', () => {
    it('should return history from parent context', () => {
      expect(runStepContext.history).toEqual(context.history);
    });

    it('should return undefined when parent history is undefined', () => {
      const contextWithoutHistory = { ...context, history: undefined };
      const flowCtx = new RunFlowContext(contextWithoutHistory);
      const stepCtx = flowCtx.step();
      expect(stepCtx.history).toBeUndefined();
    });
  });

  describe('step', () => {
    it('should create a new step context', () => {
      const newStep = runStepContext.step();
      expect(newStep).toBeInstanceOf(Object);
      expect(runStepContext.steps).toHaveLength(1);
      expect(runStepContext.steps[0]).toBe(newStep);
    });

    it('should create multiple steps', () => {
      const step1 = runStepContext.step();
      const step2 = runStepContext.step();
      const step3 = runStepContext.step();

      expect(runStepContext.steps).toHaveLength(3);
      expect(runStepContext.steps).toEqual([step1, step2, step3]);
    });
  });

  describe('setData', () => {
    it('should store data in the step context', () => {
      const data = { test: 'value', number: 42 };
      runStepContext.setData(data);
      expect((runStepContext as any).data).toEqual(data);
    });

    it('should overwrite existing data', () => {
      runStepContext.setData({ test: 'old' });
      runStepContext.setData({ test: 'new' });
      expect((runStepContext as any).data).toEqual({ test: 'new' });
    });
  });
});
