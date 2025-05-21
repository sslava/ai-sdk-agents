import { LanguageModel, Message, TelemetrySettings } from 'ai';
import { Schema, z } from 'zod';

import { GenericToolSet, inferParameters, ToolParameters } from './tools.js';
import { Context } from './context.js';

export type PromptType = { messages?: Message[]; prompt?: string };

export type LlmAgent<C extends Context, P extends ToolParameters> = {
  isLlmAgent: true;

  name?: string;
  description?: string;
  model: LanguageModel;
  toolCallStreaming?: boolean;
  system: string | ((ctx: C) => string);
  tools?: GenericToolSet<C>;
  toolChoice?: z.infer<typeof toolChoiceSchema>;
  output?: z.Schema<any, z.ZodTypeDef, any> | Schema<any>;
  asTool?: {
    input: P;
    getPrompt: (args: inferParameters<P>) => PromptType;
  };
  maxSteps?: number;
  telemetry?: TelemetrySettings;
};

export type LlmAgentConfig<C extends Context, P extends ToolParameters> = Omit<
  LlmAgent<C, P>,
  'isLlmAgent'
>;

export function agent<C extends Context, P extends ToolParameters>({
  toolCallStreaming = true,
  ...config
}: LlmAgentConfig<C, P>): LlmAgent<C, P> {
  return {
    ...config,
    isLlmAgent: true,
    toolCallStreaming,
  };
}

export const toolChoiceSchema = z.union([
  z.enum(['auto', 'required', 'none']),
  z.object({
    type: z.literal('tool'),
    toolName: z.string(),
  }),
]);
