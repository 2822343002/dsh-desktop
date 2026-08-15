import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { readClipboard, writeClipboard, buildReadCommand, buildWriteCommand } from './clipboard.js'

export const name = 'tool-clipboard'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(
    defineTool({
      name: 'clipboard_read',
      description:
        'Read the current system clipboard text. Use when you need content the user copied.',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute() {
        return readClipboard(buildReadCommand(process.platform))
      },
    }),
  )
  ctx.tools.register(
    defineTool({
      name: 'clipboard_write',
      description:
        'Write text to the system clipboard. Use to hand content back to the user for pasting elsewhere.',
      parameters: {
        text: {
          type: 'string',
          required: true,
          description: 'Text to put on the clipboard',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        return writeClipboard(buildWriteCommand(process.platform, args.text))
      },
    }),
  )
}

export { buildReadCommand, buildWriteCommand }
