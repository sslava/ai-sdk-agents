import assert from 'node:assert';

import {
  formatDataStreamPart,
  smoothStream,
  streamText,
  StreamTextOnFinishCallback,
  tool,
  Tool,
  ToolSet,
} from 'ai';

import { getContextPrompt, RunFlowContext } from './context.js';
import { LlmAgent } from './agent.js';
import { GenericToolSet, inferParameters, IToolFactory, ToolParameters } from './tools.js';

type FlowOptions = {
  onStreamChatFinish?: StreamTextOnFinishCallback<ToolSet>;
};

export abstract class BaseChatFlow<C extends RunFlowContext> {
  protected readonly telemetry = process.env.NODE_ENV === 'production';

  constructor(protected readonly options: FlowOptions) {}

  public abstract run(ctx: C): Promise<void>;

  protected async streamChatHistory<T extends GenericToolSet<C, P>, P extends ToolParameters>(
    agent: LlmAgent<C, T, P>,
    ctx: C
  ) {
    const tools = this.getTools(agent.tools, ctx);
    const systemPrompt = getContextPrompt(agent.systemPrompt, ctx);
    const result = streamText({
      model: agent.model,
      system: systemPrompt,
      tools,
      experimental_transform: smoothStream({ chunking: 'word' }),
      toolCallStreaming: agent.toolCallStreaming,
      maxSteps: agent.maxSteps,
      messages: ctx.history,
      onFinish: this.options.onStreamChatFinish,
      experimental_telemetry: agent.telemetry
        ? { isEnabled: this.telemetry, functionId: 'stream-text' }
        : undefined,
    });

    result.consumeStream();
    ctx.writer?.mergeTextResult(result);
    return result;
  }

  protected createLlmTool<T extends GenericToolSet<C, P>, P extends ToolParameters>(
    agent: LlmAgent<C, T, P>,
    ctx: C
  ) {
    assert(agent.toolParams, 'toolParams is required');
    assert(agent.description, 'description is required');

    const { parameters, argsToMessages } = agent.toolParams;

    return tool({
      description: agent.description,
      parameters,
      execute: async (args: inferParameters<P> & { reasoning?: string }) => {
        try {
          if (typeof args.reasoning === 'string') {
            ctx.writer?.getStream()?.write(formatDataStreamPart('reasoning', args.reasoning));
          }

          const systemPrompt = getContextPrompt(agent.systemPrompt, ctx);
          const tools = this.getTools(agent.tools, ctx);

          const messages = argsToMessages(args);
          const result = await streamText({
            model: agent.model,
            system: systemPrompt,
            messages,
            tools,
            maxSteps: agent.maxSteps,
            // onFinish: ({ response }) => {
            //   const finalMessages = appendResponseMessages({
            //     messages,
            //     responseMessages: response.messages,
            //   }).slice(messages.length);
            //   console.log('tool-call', agent.description);
            //   console.dir(finalMessages, { depth: null });
            // },
          });

          await result.consumeStream();
          const text = await result.text;

          return { result: text, success: true };
        } catch (error) {
          console.error(`${agent.name ?? agent.description} tool error:`, error);
          return {
            result: error instanceof Error ? error.message : 'Unknown error occurred',
            success: false,
          };
        }
      },
    });
  }

  protected getTools<T extends GenericToolSet<C, P>, P extends ToolParameters>(
    factories: T | undefined,
    ctx: C
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
    ctx: C,
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
  C extends RunFlowContext,
  T extends GenericToolSet<C, P>,
  P extends ToolParameters,
> extends BaseChatFlow<C> {
  protected readonly agent: LlmAgent<C, T, P>;
  constructor({
    agent,
    onFinish,
  }: {
    onFinish?: StreamTextOnFinishCallback<ToolSet>;
    agent: LlmAgent<C, T, P>;
  }) {
    super({ onStreamChatFinish: onFinish });
    this.agent = agent;
  }

  public override async run(ctx: C): Promise<void> {
    await this.streamChatHistory(this.agent, ctx);
  }
}
