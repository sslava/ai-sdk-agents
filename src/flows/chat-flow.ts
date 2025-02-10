import { Context, IRunContext } from '../context.js';
import { LlmAgent } from '../agent.js';
import { ToolParameters } from '../tools.js';
import { AgentFlow } from '../flow.js';

export class ChatFlow<C extends Context, P extends ToolParameters> extends AgentFlow<C> {
  protected readonly agent: LlmAgent<C, P>;

  constructor({
    agent,
    onFinish,
  }: {
    agent: LlmAgent<C, P>;
    onFinish?: (event: any, ctx: IRunContext<C>) => Promise<void> | void;
  }) {
    super({ onChatStreamFinish: onFinish });
    this.agent = agent;
  }

  public async run(ctx: C) {
    const context = this.createContext(ctx);
    const result = await this.streamChat(this.agent, context.step());
    return { context, result };
  }
}
