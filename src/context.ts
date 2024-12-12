import { Message as AIMessage, DataStreamWriter } from 'ai';
import { VercelStreamWriter } from './stream.js';

export type Context = {
  readonly dataStream?: DataStreamWriter;
  readonly history?: AIMessage[];
};

export interface IRunContext<C extends Context> {
  readonly steps: RunStepContext<C>[];

  get writer(): VercelStreamWriter;
  get inner(): C;
  get history(): AIMessage[] | undefined;

  step(): IRunContext<C>;
}

class RunStepContext<C extends Context> implements IRunContext<C> {
  public readonly steps: RunStepContext<C>[] = [];

  public readonly data: Record<string, unknown> = {};

  public get history(): AIMessage[] | undefined {
    return this.context.history;
  }

  public get inner(): C {
    return this.context.inner;
  }

  public get writer(): VercelStreamWriter {
    return this.context.writer;
  }

  constructor(public readonly context: RunFlowContext<C>) {}

  public step(): IRunContext<C> {
    const step = new RunStepContext(this.context);
    this.steps.push(step);
    return step;
  }
}

export class RunFlowContext<C extends Context> implements IRunContext<C> {
  public writer: VercelStreamWriter;

  public messages: AIMessage[] = [];

  public readonly inner: C;

  public readonly steps: RunStepContext<C>[] = [];

  constructor(ctx: C) {
    this.inner = ctx;
    this.writer = new VercelStreamWriter(ctx.dataStream);
  }

  public step(): IRunContext<C> {
    const step = new RunStepContext(this);
    this.steps.push(step);
    return step;
  }

  public get history(): AIMessage[] | undefined {
    return this.inner.history;
  }
}
