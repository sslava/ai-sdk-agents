import { LanguageModel, Message as AIMessage } from 'ai';
import { Schema, z } from 'zod';

import { GenericToolSet, inferParameters, ToolParameters } from './tools.js';
import { Context } from './context.js';

export type PromptType = { messages?: AIMessage[]; prompt?: string };

export type LlmAgent<C extends Context, T extends GenericToolSet<C>, P extends ToolParameters> = {
  isLlmAgent: true;

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
};

export type LlmAgentConfig<
  C extends Context,
  T extends GenericToolSet<C>,
  P extends ToolParameters,
> = Omit<LlmAgent<C, T, P>, 'isLlmAgent'>;

export function agent<C extends Context, T extends GenericToolSet<C>, P extends ToolParameters>({
  toolCallStreaming = true,
  telemetry = true,
  ...config
}: LlmAgentConfig<C, T, P>): LlmAgent<C, T, P> {
  return {
    ...config,
    isLlmAgent: true,
    toolCallStreaming,
    telemetry,
  };
}

export const toolCallReasoningParameter = {
  reasoning: z
    .string()
    .describe(
      'Provide explanation for the tool call in for of progress. for example: "analyzing user profile" or "searching for relevant information"'
    ),
};
