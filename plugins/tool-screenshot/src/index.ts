import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { buildCaptureCommand, buildOutputPath, runCapture, type Region } from './capture.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const name = 'tool-screenshot'
export const inject = ['tools', 'attachments']

export function apply(ctx: Context) {
  ctx.tools.register(
    defineTool({
      name: 'take_screenshot',
      description:
        'Capture the screen (full screen or a region) and attach the image so a vision-capable model can see it. ' +
        'Use for UI automation, debugging visual issues, or reading on-screen content.',
      parameters: {
        x: { type: 'number', description: 'Region left (optional; omit for full screen)' },
        y: { type: 'number', description: 'Region top (optional)' },
        width: { type: 'number', description: 'Region width (optional)' },
        height: { type: 'number', description: 'Region height (optional)' },
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            width: { type: 'number' },
            height: { type: 'number' },
            bytes: { type: 'number' },
          },
          additionalProperties: false,
        },
        render: (_args, value) => {
          const v = value as { file: string; width: number; height: number }
          return [
            {
              type: 'text',
              text: `截图已保存：${v.file}（${v.width}x${v.height}）`,
            },
          ]
        },
      },
      async execute(args, exec) {
        const region: Region | undefined =
          args.x !== undefined && args.y !== undefined && args.width !== undefined && args.height !== undefined
            ? { x: args.x, y: args.y, width: args.width, height: args.height }
            : undefined

        const shotsDir = path.join(
          process.env.DSH_HOME || path.join(os.homedir(), '.dsh'),
          'screenshots',
        )
        fs.mkdirSync(shotsDir, { recursive: true })
        const outPath = buildOutputPath(shotsDir)

        const cmd = buildCaptureCommand(process.platform, outPath, region)
        await runCapture(cmd, outPath)

        const data = fs.readFileSync(outPath)
        const ref = await ctx.attachments.saveImage({
          data,
          mediaType: 'image/png',
          name: path.basename(outPath),
        })

        return {
          file: outPath,
          width: ref.width,
          height: ref.height,
          bytes: ref.bytes,
        }
      },
    }),
  )
}
