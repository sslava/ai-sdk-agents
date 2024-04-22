import { Message as AIMessage, DataStreamWriter, Message } from 'ai';
import { VercelStreamWriter } from './stream.js';

export class RunFlowContext {
  public writer: VercelStreamWriter;

  public messages: Message[] = [];

  constructor(
    dataStream: DataStreamWriter,
    public history: AIMessage[]
  ) {
    this.writer = new VercelStreamWriter(dataStream);
  }

  public onAgentFinish(messages: AIMessage[]) {
    this.messages.push(...messages);
  }
}

export function getContextPrompt<C extends RunFlowContext>(
  prompt: string | ((ctx: C) => string),
  ctx: C
) {
  if (typeof prompt === 'function') {
    return prompt(ctx);
  }
  return prompt;
}
