import { Message as AIMessage, CoreAssistantMessage, CoreToolMessage, DataStreamWriter } from 'ai';

import { VercelStreamWriter } from './stream.js';

export type AIResponseMessage = (CoreAssistantMessage | CoreToolMessage) & {
  id: string;
};

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

  setData(data: Record<string, unknown>): void;
}

class RunStepContext<C extends Context> implements IRunContext<C> {
  public readonly steps: RunStepContext<C>[] = [];

  public data: Record<string, unknown> = {};

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

  public setData(data: Record<string, unknown>): void {
    this.data = data;
  }
}

export class RunFlowContext<C extends Context> implements IRunContext<C> {
  public writer: VercelStreamWriter;

  public messages: AIMessage[] = [];

  public responseMessages: AIResponseMessage[] = [];

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

  public setData(_: Record<string, unknown>): void {}
}
