import { LanguageModel, Message as AIMessage } from 'ai';
import { Schema, z } from 'zod';

import { GenericToolSet, inferParameters, ToolParameters } from './tools.js';
import { Context } from './context.js';

export type PromptType = { messages?: AIMessage[]; prompt?: string };

export class LlmAgent<C extends Context, T extends GenericToolSet<C, P>, P extends ToolParameters> {
  public readonly isLlmAgent = true;

  public readonly output?: z.Schema<T, z.ZodTypeDef, any> | Schema<T>;

  public readonly name?: string;
  public readonly description?: string;
  public readonly model: LanguageModel;
  public readonly tools?: T;
  public readonly system: string | ((ctx: C) => string);
  public readonly toolCallStreaming?: boolean;
  public readonly maxSteps?: number;

  public readonly toolParams?: {
    input: P;
    getPrompt: (args: inferParameters<P>) => PromptType;
  };

  public readonly telemetry?: boolean;

  constructor({
    name,
    description,
    system,
    tools,
    toolCallStreaming = true,
    maxSteps,
    model,
    asTool,
    telemetry = true,
  }: {
    name?: string;
    description?: string;
    model: LanguageModel;
    toolCallStreaming?: boolean;
    system: string | ((ctx: C) => string);
    tools?: T;
    output?: z.Schema<T, z.ZodTypeDef, any> | Schema<T>;
    asTool?: {
      input: P;
      getPrompt: (args: inferParameters<P>) => PromptType;
    };
    maxSteps?: number;
    telemetry?: boolean;
  }) {
    this.name = name;
    this.description = description;
    this.system = system;
    this.tools = tools;
    this.model = model;
    this.toolCallStreaming = toolCallStreaming;
    this.maxSteps = maxSteps;
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
