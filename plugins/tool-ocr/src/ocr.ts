export interface OcrOptions {
  /** 识别语言（tesseract 语言代码，如 eng / chi_sim / eng+chi_sim） */
  lang: string
  /** 语言数据本地目录（离线用）；缺省走 tesseract.js 默认 CDN */
  langPath?: string
  /** 单次识别超时（毫秒） */
  timeoutMs: number
  /** 识别前最大边长（像素），过大图片先缩放，提速 */
  maxDimension: number
}

export const DEFAULT_OCR_OPTIONS: OcrOptions = {
  lang: 'eng',
  timeoutMs: 120_000,
  maxDimension: 2048,
}

/** 从工具参数构造 OCR 选项（纯函数，可单测） */
export function buildOcrOptions(raw: {
  lang?: string
  langPath?: string
  maxDimension?: number
  timeoutMs?: number
}): OcrOptions {
  return {
    lang: raw.lang && raw.lang.trim() ? raw.lang.trim() : DEFAULT_OCR_OPTIONS.lang,
    langPath: raw.langPath && raw.langPath.trim() ? raw.langPath.trim() : undefined,
    maxDimension:
      raw.maxDimension && Number.isFinite(raw.maxDimension) && raw.maxDimension > 0
        ? Math.floor(raw.maxDimension)
        : DEFAULT_OCR_OPTIONS.maxDimension,
    timeoutMs:
      raw.timeoutMs && Number.isFinite(raw.timeoutMs) && raw.timeoutMs > 0
        ? Math.floor(raw.timeoutMs)
        : DEFAULT_OCR_OPTIONS.timeoutMs,
  }
}

/** 识别结果文本清洗：去控制字符、压缩连续空白、保留行结构（纯函数，可单测） */
export function cleanOcrText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '') // 去控制字符（保留 \n \t）
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim()) // 行内压缩空白
    .filter((line) => line.length > 0) // 去空行
    .join('\n')
    .trim()
}

/** 从 tesseract.js 识别结果中提取文本（纯函数，可单测） */
export function extractText(result: { data?: { text?: string } }): string {
  const text = result?.data?.text ?? ''
  return cleanOcrText(text)
}
