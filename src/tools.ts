import { Tool } from 'ai';
import { z, Schema } from 'zod';
import { LlmAgent } from './agent.js';
import { RunFlowContext } from './context.js';

export type ToolParameters = z.ZodTypeAny | Schema<any>;

export type inferParameters<PARAMETERS extends ToolParameters> =
  PARAMETERS extends Schema<any>
    ? PARAMETERS['_type']
    : PARAMETERS extends z.ZodTypeAny
      ? z.infer<PARAMETERS>
      : never;

export type GenericToolSet<C extends RunFlowContext, P extends ToolParameters> = Record<
  string,
  Tool | LlmAgent<C, GenericToolSet<C, P>, P> | IToolFactory<C>
>;

export type IToolFactory<C extends RunFlowContext> = {
  createTool: (ctx: C) => Tool;
};
