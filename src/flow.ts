import assert from 'node:assert';

import {
  smoothStream,
  streamText,
  StreamTextOnFinishCallback,
  tool,
  Tool,
  ToolSet,
  Output,
  generateText,
  Message as AIMessage,
  StepResult,
} from 'ai';

import { Context, getContextPrompt, RunFlowContext } from './context.js';
import { LlmAgent } from './agent.js';
import { GenericToolSet, inferParameters, IToolFactory, ToolParameters } from './tools.js';

export type StreamChatFinishCallback<C extends Context, TOOLS extends ToolSet> = (
  event: Omit<StepResult<TOOLS>, 'stepType' | 'isContinued'> & {
    readonly steps: StepResult<TOOLS>[];
  },
  ctx: RunFlowContext<C>
) => Promise<void> | void;

type FlowOptions<C extends Context> = {
  onChatStreamFinish?: StreamChatFinishCallback<C, ToolSet>;
};

export abstract class BaseChatFlow<C extends Context> {
  protected readonly telemetry = process.env.NODE_ENV === 'production';

  constructor(protected readonly options: FlowOptions<C>) {}

  public abstract run(ctx: C): Promise<void>;

  protected async streamChat<T extends GenericToolSet<C, P>, P extends ToolParameters>(
    agent: LlmAgent<C, T, P>,
    ctx: RunFlowContext<C>
  ) {
    const result = await this.streamText(agent, ctx, ctx.ctx.history ?? [], (event) =>
      this.options.onChatStreamFinish?.(event, ctx)
    );

    result.consumeStream();
    ctx.writer?.mergeTextResult(result);
    return result;
  }

  private async streamText<T extends GenericToolSet<C, P>, P extends ToolParameters>(
    agent: LlmAgent<C, T, P>,
    ctx: RunFlowContext<C>,
    messages: AIMessage[],
    onFinish?: StreamTextOnFinishCallback<ToolSet>
  ) {
    return streamText({
      model: agent.model,
      system: getContextPrompt(agent.system, ctx.ctx),
      messages,
      tools: this.getTools(agent.tools, ctx),
      toolCallStreaming: agent.toolCallStreaming,
      maxSteps: agent.maxSteps,
      experimental_transform: smoothStream({ chunking: 'word' }),
      onFinish,
      experimental_telemetry: agent.telemetry
        ? { isEnabled: this.telemetry, functionId: 'stream-text' }
        : undefined,
    });
  }

  protected createLlmTool<T extends GenericToolSet<C, P>, P extends ToolParameters>(
    agent: LlmAgent<C, T, P>,
    ctx: RunFlowContext<C>
  ) {
    assert(agent.toolParams, 'toolParams is required');
    assert(agent.description, 'description is required');

    const { input, argsToMessages } = agent.toolParams;

    return tool({
      description: agent.description,
      parameters: input,
      execute: async (args: inferParameters<P> & { reasoning?: string }) => {
        try {
          ctx.writer?.reasoning(args.reasoning);

          const result = await generateText({
            model: agent.model,
            system: getContextPrompt(agent.system, ctx.ctx),
            messages: argsToMessages(args),
            tools: this.getTools(agent.tools, ctx),
            maxSteps: agent.maxSteps,
            experimental_output: agent.output ? Output.object({ schema: agent.output }) : undefined,
            experimental_telemetry: agent.telemetry
              ? { isEnabled: this.telemetry, functionId: 'stream-text' }
              : undefined,
          });

          if (agent.output) {
            return result.experimental_output;
          }

          return { response: result.text, success: true };
        } catch (error) {
          console.error(`${agent.name ?? agent.description} tool error:`, error);
          return {
            response: error instanceof Error ? error.message : 'Unknown error occurred',
            success: false,
          };
        }
      },
    });
  }

  private getTools<T extends GenericToolSet<C, P>, P extends ToolParameters>(
    factories: T | undefined,
    ctx: RunFlowContext<C>
  ) {
    if (!factories) {
      return undefined;
    }
    const tools: ToolSet = {};
    for (const [key, tool] of Object.entries(factories)) {
      tools[key] = this.getTool(ctx, tool);
    }
    return tools;
  }

  private getTool<T extends GenericToolSet<C, P>, P extends ToolParameters>(
    ctx: RunFlowContext<C>,
    tool: Tool | LlmAgent<C, GenericToolSet<C, P>, P> | IToolFactory<C>
  ): Tool {
    const llmTool = tool as LlmAgent<C, T, P>;
    if (llmTool.isLlmAgent) {
      return this.createLlmTool(llmTool, ctx);
    }
    const factory = tool as IToolFactory<C>;
    if (factory.createTool) {
      return factory.createTool(ctx);
    }
    return tool as Tool;
  }
}

export class ToolingFlow<
  C extends Context,
  T extends GenericToolSet<C, P>,
  P extends ToolParameters,
> extends BaseChatFlow<C> {
  protected readonly agent: LlmAgent<C, T, P>;
  constructor({
    agent,
    onFinish,
  }: {
    onFinish?: StreamChatFinishCallback<C, ToolSet>;
    agent: LlmAgent<C, T, P>;
  }) {
    super({ onChatStreamFinish: onFinish });
    this.agent = agent;
  }

  public override async run(ctx: C): Promise<void> {
    const runCtx = new RunFlowContext<C>(ctx);
    await this.streamChat(this.agent, runCtx);
  }
}
