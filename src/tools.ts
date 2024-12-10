import { Tool } from 'ai';
import { z, Schema } from 'zod';
import { LlmAgent } from './agent.js';
import { Context, RunFlowContext } from './context.js';

export type ToolParameters = z.ZodTypeAny | Schema<any>;

export type inferParameters<PARAMETERS extends ToolParameters> =
  PARAMETERS extends Schema<any>
    ? PARAMETERS['_type']
    : PARAMETERS extends z.ZodTypeAny
      ? z.infer<PARAMETERS>
      : never;

export type ToolEntry<C extends Context> = Tool | LlmAgent<C, any, any> | IToolFactory<C>;

export type GenericToolSet<C extends Context> = Record<string, ToolEntry<C>>;

export type IToolFactory<C extends Context> = {
  createTool: (ctx: RunFlowContext<C>) => Tool;
};
