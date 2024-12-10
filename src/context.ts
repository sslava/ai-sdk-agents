import { Message as AIMessage, DataStreamWriter } from 'ai';
import { VercelStreamWriter } from './stream.js';

export type Context = {
  readonly dataStream?: DataStreamWriter;
  readonly history?: AIMessage[];
};

export class RunFlowContext<C extends Context> {
  public writer: VercelStreamWriter;

  public messages: AIMessage[] = [];

  public responseMessages: AIMessage[] = [];

  public readonly inner: C;

  constructor(ctx: C) {
    this.inner = ctx;
    this.writer = new VercelStreamWriter(ctx.dataStream);
  }

  public get history(): AIMessage[] | undefined {
    return this.inner.history;
  }

  public appendMessages(messages: AIMessage[]) {
    this.messages.push(...messages);
  }

  public appendResponseMessages(messages: AIMessage[]) {
    this.responseMessages.push(...messages);
  }
}

export function getContextPrompt<C extends Context>(
  prompt: string | ((ctx: C) => string),
  ctx: RunFlowContext<C>
) {
  if (typeof prompt === 'function') {
    return prompt(ctx.inner);
  }
  return prompt;
}
