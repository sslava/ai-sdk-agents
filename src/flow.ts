import {
  smoothStream,
  streamText,
  StreamTextOnFinishCallback,
  tool,
  Tool,
  ToolSet,
  Output,
  generateText,
  Message,
  StepResult,
  StreamTextOnStepFinishCallback,
  GenerateTextOnStepFinishCallback,
  generateObject,
  generateId,
  TelemetrySettings,
} from 'ai';

import { Context, IRunContext, RunFlowContext } from './context.js';
import { LlmAgent, PromptType } from './agent.js';

import { GenericToolSet, inferParameters, IToolFactory, ToolParameters } from './tools.js';
import { getContextPrompt } from './prompt.js';

export type StreamChatFinishCallback<C extends Context, TOOLS extends ToolSet> = (
  event: Omit<StepResult<TOOLS>, 'stepType' | 'isContinued'> & {
    readonly steps: StepResult<TOOLS>[];
  },
  ctx: IRunContext<C>
) => Promise<void> | void;

type TelemetrySettingsCallback<C extends Context> = (
  agent: LlmAgent<C, ToolParameters>,
  ctx: IRunContext<C>
) => TelemetrySettings | undefined;

type FlowOptions<C extends Context> = {
  onChatStreamFinish?: StreamChatFinishCallback<C, ToolSet>;
  telemetry?: false | TelemetrySettings | TelemetrySettingsCallback<C>;
};

export abstract class AgentFlow<C extends Context> {
  constructor(
    protected readonly options: FlowOptions<C>,
    protected readonly generateUUID = generateId
  ) {}

  protected async streamChat<P extends ToolParameters>(agent: LlmAgent<C, P>, ctx: IRunContext<C>) {
    const result = await this.agentStreamText(agent, ctx, ctx.inner.history ?? [], (event) =>
      this.options.onChatStreamFinish?.(event, ctx)
    );

    result.consumeStream();
    ctx.writer.mergeTextResult(result);

    ctx.setData({ steps: result.steps });

    return result;
  }

  protected async agentStreamText<P extends ToolParameters>(
    agent: LlmAgent<C, P>,
    ctx: IRunContext<C>,
    messages: Message[],
    onFinish?: StreamTextOnFinishCallback<ToolSet>,
    onStepFinish?: StreamTextOnStepFinishCallback<ToolSet>
  ) {
    return streamText({
      model: agent.model,
      system: getContextPrompt(agent.system, ctx),
      messages,
      tools: this.getTools(agent.tools, ctx),
      toolChoice: agent.toolChoice,
      toolCallStreaming: agent.toolCallStreaming,
      maxSteps: agent.maxSteps,
      experimental_transform: smoothStream({ chunking: 'word' }),
      experimental_generateMessageId: this.generateUUID,
      onFinish,
      onStepFinish,
      experimental_telemetry: this.getTelemetry(agent, ctx),
    });
  }

  protected async agentGenerateText<P extends ToolParameters>(
    agent: LlmAgent<C, P>,
    ctx: IRunContext<C>,
    prompt: PromptType,
    onStepFinish?: GenerateTextOnStepFinishCallback<ToolSet>
  ) {
    return generateText({
      model: agent.model,
      system: getContextPrompt(agent.system, ctx),
      ...prompt,
      tools: this.getTools(agent.tools, ctx),
      toolChoice: agent.toolChoice,
      maxSteps: agent.maxSteps,
      onStepFinish,
      experimental_generateMessageId: this.generateUUID,
      experimental_output: agent.output ? Output.object({ schema: agent.output }) : undefined,
      experimental_telemetry: this.getTelemetry(agent, ctx),
    });
  }

  protected agentGenerateObject<P extends ToolParameters>(
    agent: LlmAgent<C, P>,
    ctx: IRunContext<C>,
    prompt: PromptType
  ) {
    if (!agent.output) {
      throw new Error('output is required');
    }

    return generateObject({
      model: agent.model,
      system: getContextPrompt(agent.system, ctx),
      ...prompt,
      schema: agent.output,
      experimental_telemetry: this.getTelemetry(agent, ctx),
    });
  }

  protected createLlmTool<P extends ToolParameters>(agent: LlmAgent<C, P>, ctx: IRunContext<C>) {
    if (!agent.asTool || !agent.description) {
      throw new Error('asTool and description are required');
    }

    const { input, getPrompt } = agent.asTool;

    return tool({
      description: agent.description,
      parameters: input,
      execute: async (args: inferParameters<P> & { reasoning?: string }) => {
        try {
          const toolCount = Object.keys(agent.tools ?? {}).length;

          const memoryKey = agent.name ?? agent.description;
          const store = ctx.memory;
          let history: Message[] | undefined;
          if (store && memoryKey) {
            history = await store.load(memoryKey);
          }

          let prompt = getPrompt(args);
          if (history?.length) {
            if (prompt.messages) {
              prompt = { messages: [...history, ...prompt.messages] };
            } else if (prompt.prompt) {
              prompt = {
                messages: [
                  ...history,
                  { role: 'user', content: prompt.prompt, id: this.generateUUID() },
                ],
              };
            }
          }

          if (!toolCount && agent.output) {
            const { object } = await this.agentGenerateObject(agent, ctx, prompt);
            if (store && memoryKey) {
              const newHistory = [
                ...(history ?? []),
                ...(prompt.messages?.slice(-1) ?? [
                  { role: 'user' as const, content: prompt.prompt ?? '', id: this.generateUUID() },
                ]),
                {
                  role: 'assistant' as const,
                  content: JSON.stringify(object),
                  id: this.generateUUID(),
                },
              ];
              await store.save(memoryKey, newHistory);
            }
            return object;
          }

          const result = await this.agentGenerateText(agent, ctx, prompt, () => {});

          const answer = agent.output ? JSON.stringify(result.experimental_output) : result.text;
          if (store && memoryKey) {
            const newHistory = [
              ...(history ?? []),
              ...(prompt.messages?.slice(-1) ?? [
                { role: 'user' as const, content: prompt.prompt ?? '', id: this.generateUUID() },
              ]),
              { role: 'assistant' as const, content: answer, id: this.generateUUID() },
            ];
            await store.save(memoryKey, newHistory);
          }

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

  private getTools<T extends GenericToolSet<C>>(
    factories: T | undefined,
    parentContext: IRunContext<C>
  ) {
    if (!factories) {
      return undefined;
    }
    const tools: ToolSet = {};
    for (const [key, tool] of Object.entries(factories)) {
      tools[key] = this.getTool(parentContext, tool);
    }
    return tools;
  }

  private getTool<P extends ToolParameters>(
    parentContext: IRunContext<C>,
    tool: Tool | LlmAgent<C, P> | IToolFactory<C>
  ): Tool {
    const llmTool = tool as LlmAgent<C, P>;
    if (llmTool.isLlmAgent) {
      return this.createLlmTool(llmTool, parentContext.step());
    }
    const factory = tool as IToolFactory<C>;
    if (factory.createTool) {
      return factory.createTool(parentContext.step());
    }
    return tool as Tool;
  }

  public createContext(ctx: C): IRunContext<C> {
    return new RunFlowContext<C>(ctx);
  }

  private getTelemetry<P extends ToolParameters>(
    agent: LlmAgent<C, P>,
    ctx: IRunContext<C>
  ): TelemetrySettings | undefined {
    if (!this.options.telemetry) {
      return undefined;
    }
    if (typeof this.options.telemetry === 'function') {
      return this.options.telemetry(agent, ctx);
    }
    return { ...(agent.telemetry ?? {}), ...this.options.telemetry };
  }
}
