import { Context, IRunContext } from './context.js';

export function getContextPrompt<C extends Context>(
  prompt: string | ((ctx: C) => string),
  ctx: IRunContext<C>
) {
  if (typeof prompt === 'function') {
    return prompt(ctx.inner);
  }
  return prompt;
}
