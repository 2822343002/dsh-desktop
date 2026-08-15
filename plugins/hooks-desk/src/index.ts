import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'
import { evaluateCommand } from './policy.js'

export const name = 'hooks-desk'
export const inject = ['tools']

/**
 * 危险命令门禁：在 tools/pre-execute 钩子上拦截删除/格式化/关机/外传类命令。
 * 命中策略时返回 deny（后续监听器无法撤销），否则委托 next()。
 */
export function apply(ctx: Context) {
  ctx.on(
    'tools/pre-execute',
    async (exec: ToolExecution, next: () => Promise<PreToolDecision>): Promise<PreToolDecision> => {
      const decision = evaluateCommand(exec.name, exec.arguments)
      if (decision.denied) {
        return {
          kind: 'deny',
          reason: `危险命令被 hooks-desk 拦截：${decision.reason}`,
        }
      }
      return next()
    },
  )
}
