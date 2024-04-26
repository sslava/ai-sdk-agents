import { Message as AIMessage, DataStreamWriter } from 'ai';
import { VercelStreamWriter } from './stream.js';

export type Context = {
  dataStream?: DataStreamWriter;
  history?: AIMessage[];
};

export class RunFlowContext<C extends Context> {
  public writer: VercelStreamWriter;

  public messages: AIMessage[] = [];

  public ctx: C;

  constructor(ctx: C) {
    this.ctx = ctx;
    this.writer = new VercelStreamWriter(ctx.dataStream);
  }

  public appendMessages(messages: AIMessage[]) {
    this.messages.push(...messages);
  }
}

export function getContextPrompt<C extends Context>(prompt: string | ((ctx: C) => string), ctx: C) {
  if (typeof prompt === 'function') {
    return prompt(ctx);
  }
  return prompt;
}
