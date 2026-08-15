import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { buildOcrOptions, DEFAULT_OCR_OPTIONS, extractText } from './ocr.js'

export const name = 'tool-ocr'
export const inject = ['tools']

/** 用 Tesseract.js 识别图片文本（懒加载 worker，避免空转） */
async function recognizeImage(imagePath: string, lang: string, langPath?: string): Promise<string> {
  // 动态导入：仅在首次调用时加载 tesseract.js
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(lang, 1, {
    langPath,
    logger: () => undefined,
  })
  try {
    const result = await worker.recognize(imagePath)
    return extractText(result)
  } finally {
    await worker.terminate()
  }
}

export function apply(ctx: Context) {
  ctx.tools.register(
    defineTool({
      name: 'ocr_image',
      description:
        'Recognize text in an image (local OCR via Tesseract). ' +
        'Use for screenshots, scanned documents, or any image that contains text the model should read.',
      parameters: {
        image: {
          type: 'string',
          required: true,
          description: 'Absolute path to the image file (png/jpg/webp)',
        },
        lang: {
          type: 'string',
          description: 'OCR language(s), e.g. eng, chi_sim, eng+chi_sim. Default: eng',
        },
        langPath: {
          type: 'string',
          description: 'Local directory with tessdata language files (for offline use)',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const opts = buildOcrOptions(args)
        const text = await recognizeImage(args.image, opts.lang, opts.langPath)
        if (!text) return '（未识别到文本）'
        return text
      },
    }),
  )
}
