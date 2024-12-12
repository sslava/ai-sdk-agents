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
  StreamTextOnStepFinishCallback,
  GenerateTextOnStepFinishCallback,
  generateObject,
} from 'ai';

import { Context, IRunContext, RunFlowContext } from './context.js';
import { LlmAgent, PromptType } from './agent.js';
import { GenericToolSet, inferParameters, IToolFactory, ToolParameters } from './tools.js';
import { getContextPrompt } from './shared.js';

export type StreamChatFinishCallback<C extends Context, TOOLS extends ToolSet> = (
  event: Omit<StepResult<TOOLS>, 'stepType' | 'isContinued'> & {
    readonly steps: StepResult<TOOLS>[];
  },
  ctx: IRunContext<C>
) => Promise<void> | void;

type FlowOptions<C extends Context> = {
  onChatStreamFinish?: StreamChatFinishCallback<C, ToolSet>;
};

export abstract class AgentFlow<C extends Context> {
  protected readonly telemetry = process.env.NODE_ENV === 'production';

  constructor(protected readonly options: FlowOptions<C>) {}

  public abstract run(ctx: C): Promise<IRunContext<C>>;

  protected async streamChat<T extends GenericToolSet<C>, P extends ToolParameters>(
    agent: LlmAgent<C, T, P>,
    ctx: IRunContext<C>
  ) {
    const result = await this.agentStreamText(
      agent,
      ctx,
      ctx.inner.history ?? [],
      (event) => this.options.onChatStreamFinish?.(event, ctx),
      (event) => {
        const { response: _, request: __, ...rest } = event;
        console.log('step finish----------------------------------------------------------');
        console.dir(rest, { depth: null });
        console.log('//-------------------------------------------------------------------');
      }
    );

    result.consumeStream();
    ctx.writer?.mergeTextResult(result);
    return result;
  }

  protected async agentStreamText<T extends GenericToolSet<C>, P extends ToolParameters>(
    agent: LlmAgent<C, T, P>,
    ctx: IRunContext<C>,
    messages: AIMessage[],
    onFinish?: StreamTextOnFinishCallback<ToolSet>,
    onStepFinish?: StreamTextOnStepFinishCallback<ToolSet>
  ) {
    return streamText({
      model: agent.model,
      system: getContextPrompt(agent.system, ctx),
      messages,
      tools: this.getTools(agent.tools, ctx.step()),
      toolCallStreaming: agent.toolCallStreaming,
      maxSteps: agent.maxSteps,
      experimental_transform: smoothStream({ chunking: 'word' }),
      experimental_generateMessageId: generateUUID,
      onFinish,
      onStepFinish,
      experimental_telemetry: this.getTelemetry(agent),
    });
  }

  protected async agentGenerateText<T extends GenericToolSet<C>, P extends ToolParameters>(
    agent: LlmAgent<C, T, P>,
    ctx: IRunContext<C>,
    prompt: PromptType,
    onStepFinish?: GenerateTextOnStepFinishCallback<ToolSet>
  ) {
    return generateText({
      model: agent.model,
      system: getContextPrompt(agent.system, ctx),
      ...prompt,
      tools: this.getTools(agent.tools, ctx),
      maxSteps: agent.maxSteps,
      onStepFinish,
      experimental_output: agent.output ? Output.object({ schema: agent.output }) : undefined,
      experimental_telemetry: this.getTelemetry(agent),
    });
  }

  protected agentGenerateObject<T extends GenericToolSet<C>, P extends ToolParameters>(
    agent: LlmAgent<C, T, P>,
    ctx: IRunContext<C>,
    prompt: PromptType
  ) {
    assert(agent.output, 'output is required');

    return generateObject({
      model: agent.model,
      system: getContextPrompt(agent.system, ctx),
      ...prompt,
      schema: agent.output,
      experimental_telemetry: this.getTelemetry(agent),
    });
  }

  protected createLlmTool<T extends GenericToolSet<C>, P extends ToolParameters>(
    agent: LlmAgent<C, T, P>,
    ctx: IRunContext<C>
  ) {
    assert(agent.asTool, 'toolParams is required');
    assert(agent.description, 'description is required');

    const { input, getPrompt } = agent.asTool;

    return tool({
      description: agent.description,
      parameters: input,
      execute: async (args: inferParameters<P> & { reasoning?: string }) => {
        try {
          // tools count
          const toolCount = Object.keys(agent.tools ?? {}).length;

          // if no tools and output is defined, use generateObject
          if (!toolCount && agent.output) {
            const { object } = await this.agentGenerateObject(agent, ctx, getPrompt(args));
            return object;
          }

          // if tools are required, use generateText
          const result = await this.agentGenerateText(agent, ctx, getPrompt(args), (event) => {
            const { response: _, request: __, ...rest } = event;
            console.log('inner step finish------------------------------------------------------');
            console.dir(rest, { depth: null });
            console.log('//------------------------------------------------------------------');
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

  private getTools<T extends GenericToolSet<C>>(factories: T | undefined, ctx: IRunContext<C>) {
    if (!factories) {
      return undefined;
    }
    const tools: ToolSet = {};
    for (const [key, tool] of Object.entries(factories)) {
      tools[key] = this.getTool(ctx, tool);
    }
    return tools;
  }

  private getTool<T extends GenericToolSet<C>, P extends ToolParameters>(
    ctx: IRunContext<C>,
    tool: Tool | LlmAgent<C, GenericToolSet<C>, P> | IToolFactory<C>
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

  protected createContext<C extends Context>(ctx: C): IRunContext<C> {
    return new RunFlowContext<C>(ctx);
  }

  private getTelemetry<T extends GenericToolSet<C>, P extends ToolParameters>(
    agent: LlmAgent<C, T, P>
  ) {
    return agent.telemetry
      ? { isEnabled: this.telemetry, functionId: 'generate-object' }
      : undefined;
  }
}
