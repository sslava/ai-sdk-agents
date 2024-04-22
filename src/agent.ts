import { LanguageModel, StreamTextOnFinishCallback, ToolSet, Message as AIMessage } from 'ai';
import { z } from 'zod';

import { GenericToolSet, inferParameters, ToolParameters } from './tools.js';
import { RunFlowContext } from './context.js';

export class LlmAgent<
  C extends RunFlowContext,
  T extends GenericToolSet<C, P>,
  P extends ToolParameters,
> {
  public readonly isLlmAgent = true;

  public readonly name?: string;
  public readonly description?: string;
  public readonly model: LanguageModel;
  public readonly tools?: T;
  public readonly systemPrompt: string | ((ctx: C) => string);
  public readonly toolCallStreaming?: boolean;
  public readonly maxSteps?: number;
  public readonly onStreamTextFinish?: StreamTextOnFinishCallback<ToolSet>;

  public readonly toolParams?: {
    parameters: P;
    argsToMessages: (args: inferParameters<P>) => AIMessage[];
  };

  public readonly telemetry?: boolean;

  constructor({
    name,
    description,
    systemPrompt,
    tools,
    toolCallStreaming = true,
    maxSteps,
    model,
    asTool,
    onStreamTextFinish,
    telemetry = true,
  }: {
    name?: string;
    description?: string;
    model: LanguageModel;
    toolCallStreaming?: boolean;
    onStreamTextFinish?: StreamTextOnFinishCallback<ToolSet>;
    systemPrompt: string | ((ctx: C) => string);
    tools?: T;
    asTool?: {
      parameters: P;
      argsToMessages: (args: inferParameters<P>) => AIMessage[];
    };
    maxSteps?: number;
    telemetry?: boolean;
  }) {
    this.name = name;
    this.description = description;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.model = model;
    this.toolCallStreaming = toolCallStreaming;
    this.maxSteps = maxSteps;
    this.onStreamTextFinish = onStreamTextFinish;
    this.toolParams = asTool;
    this.telemetry = telemetry;
  }

  public static toolCallReasoningParameter = {
    reasoning: z
      .string()
      .describe(
        'Provide explanation for the tool call in for of progress. for example: "analyzing user profile" or "searching for relevant information"'
      ),
  };
}
