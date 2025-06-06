import { describe, it, expect } from 'vitest';
import { InMemoryStore } from '../src/memory';
import { AgentFlow } from '../src/flow';
import { LlmAgent } from '../src/agent';
import { Context, IRunContext } from '../src/context';
import { ToolParameters } from '../src/tools';
import { z } from 'zod';

interface TestContext extends Context {}

class MemoryFlow<C extends Context, P extends ToolParameters> extends AgentFlow<C> {
  public lastPrompt: any;
  constructor() {
    super({});
  }

  public async runTool(agent: LlmAgent<C, P>, ctx: IRunContext<C>) {
    const llmTool = this.createLlmTool(agent, ctx);
    return llmTool.execute({} as any);
  }

  protected override async agentGenerateText(
    _agent: LlmAgent<C, P>,
    _ctx: IRunContext<C>,
    prompt: any
  ) {
    this.lastPrompt = prompt;
    return { text: 'answer' } as any;
  }

  protected override async agentGenerateObject(
    _agent: LlmAgent<C, P>,
    _ctx: IRunContext<C>,
    prompt: any
  ) {
    this.lastPrompt = prompt;
    return { object: { foo: 'bar' } } as any;
  }
}

const agent: LlmAgent<TestContext, any> = {
  isLlmAgent: true,
  model: {} as any,
  description: 'test agent',
  name: 'agent1',
  toolCallStreaming: true,
  asTool: {
    input: z.object({}),
    getPrompt: () => ({ prompt: 'hi' }),
  },
};

describe('InMemoryStore', () => {
  it('stores and retrieves history', async () => {
    const store = new InMemoryStore();
    const history = [{ role: 'user', content: 'hello', id: '1' }];
    await store.save('test', history);
    expect(store.load('test')).toEqual(history);
  });

  it('overwrites existing history', async () => {
    const store = new InMemoryStore();
    await store.save('test', [{ role: 'user', content: 'first', id: '1' }]);
    const newHist = [{ role: 'assistant', content: 'second', id: '2' }];
    await store.save('test', newHist);
    expect(store.load('test')).toEqual(newHist);
  });
});

describe('Llm tool memory integration', () => {
  it('persists history between executions', async () => {
    const store = new InMemoryStore();
    const flow = new MemoryFlow<TestContext, any>();
    const ctx = flow.createContext({ memory: store });
    const step = ctx.step();

    await flow.runTool(agent, step);
    const first = store.load('agent1');
    expect(first?.length).toBe(2);

    await flow.runTool(agent, step);
    const second = store.load('agent1');
    expect(second?.length).toBe(4);
    expect(flow.lastPrompt.messages?.length).toBe(3);
  });
});
