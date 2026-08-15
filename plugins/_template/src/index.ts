import type { Context } from '@deepseek-ai/cordis'

export const name = 'template'
export const inject = ['tools']

export function apply(ctx: Context) {
  // Register capabilities here. Everything registered through ctx
  // (listeners, tools, timers) is cleaned up automatically on unload.
  ctx.tools.register(/* defineTool({ ... }) */)
}
