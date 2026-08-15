import { spawn } from 'node:child_process'

export interface GateDecision {
  denied: boolean
  reason?: string
}

/**
 * 危险命令模式：{ 正则, 理由 }。
 * 匹配 bash / PowerShell 命令文本；命中即拒绝执行。
 */
const DANGEROUS_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  // —— 递归删除危险目标 ——
  {
    re: /\brm\s+(-[a-z]*r[a-z]*\s+)+(\/|\/\*|~|\.\s*$)/i,
    reason: '递归删除根目录/家目录/当前目录',
  },
  {
    re: /\bRemove-Item\s+(-Recurse|-Force|-r|-f)/i,
    reason: 'PowerShell 递归强制删除',
  },
  {
    re: /\bdel\s+\/s\s+\/q/i,
    reason: 'Windows del /s /q 批量删除',
  },
  // —— 磁盘/分区/格式化 ——
  {
    re: /\b(?:mkfs|format|fdisk|diskpart|parted)\b/i,
    reason: '磁盘格式化/分区操作',
  },
  {
    re: /\bdd\s+if=\/dev\/(zero|urandom).*of=\/dev\/(sd|hd|nvme|mmcblk)/i,
    reason: 'dd 覆写磁盘设备',
  },
  // —— 关机/重启 ——
  {
    re: /\b(?:shutdown|reboot|halt|poweroff)\b/i,
    reason: '关机/重启操作',
  },
  // —— 数据外传（上传/隧道） ——
  {
    re: /\b(?:curl|wget)\b.*(?:-T|--upload-file|-F|--form|--data|-d |--data-binary|--post-file)\b/i,
    reason: '疑似外传文件/数据',
  },
  {
    re: /\b(?:scp|rsync)\b.*@[a-z0-9.-]+:/i,
    reason: 'scp/rsync 外传至远程主机',
  },
  {
    re: /\b(?:nc|netcat|ncat)\b/i,
    reason: '网络隧道工具',
  },
]

/** 把未知类型的参数对象规整为可检测的命令文本 */
export function argsToText(name: string, rawArgs: unknown): string {
  if (rawArgs === null || rawArgs === undefined) return ''
  if (typeof rawArgs === 'string') return rawArgs
  if (typeof rawArgs !== 'object') return String(rawArgs)
  // bash 类工具常见字段：command / args / script / cmd
  const obj = rawArgs as Record<string, unknown>
  const candidates = [obj.command, obj.cmd, obj.script, obj.args, obj.arguments]
  const found = candidates.find((c) => typeof c === 'string' && c.length > 0)
  if (found) return found as string
  if (Array.isArray(obj.args)) return obj.args.join(' ')
  return JSON.stringify(rawArgs)
}

/** 核心策略：对命令文本做危险模式检测（纯函数，可单测） */
export function evaluateCommand(name: string, rawArgs: unknown): GateDecision {
  // 仅对命令执行类工具做检查；文件读写等工具不拦截
  const shellLike = /(bash|shell|terminal|pwsh|powershell|cmd|command|exec)/i.test(name)
  if (!shellLike) return { denied: false }

  const text = argsToText(name, rawArgs)
  for (const { re, reason } of DANGEROUS_PATTERNS) {
    if (re.test(text)) {
      return { denied: true, reason }
    }
  }
  return { denied: false }
}
