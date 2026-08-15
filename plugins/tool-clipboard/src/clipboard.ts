import { spawn } from 'node:child_process'

export interface ClipboardCommand {
  command: string
  args: string[]
  input?: string
}

/** 平台无关的剪贴板读命令构造（纯函数，可单测） */
export function buildReadCommand(platform: NodeJS.Platform): ClipboardCommand {
  switch (platform) {
    case 'win32':
      return { command: 'powershell', args: ['-NoProfile', '-Command', 'Get-Clipboard'] }
    case 'darwin':
      return { command: 'pbpaste', args: [] }
    case 'linux':
      return { command: 'xclip', args: ['-o', '-selection', 'clipboard'] }
    default:
      return { command: 'echo', args: ['[clipboard] unsupported platform'] }
  }
}

/** 平台无关的剪贴板写命令构造（纯函数，可单测） */
export function buildWriteCommand(platform: NodeJS.Platform, text: string): ClipboardCommand {
  switch (platform) {
    case 'win32':
      return {
        command: 'powershell',
        args: ['-NoProfile', '-Command', 'Set-Clipboard -Value ([Console]::In.ReadToEnd())'],
        input: text,
      }
    case 'darwin':
      return { command: 'pbcopy', args: [], input: text }
    case 'linux':
      return { command: 'xclip', args: ['-selection', 'clipboard'], input: text }
    default:
      return { command: 'echo', args: ['[clipboard] unsupported platform'], input: text }
  }
}

function run(cmd: ClipboardCommand): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(cmd.command, cmd.args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => {
      out += d.toString()
    })
    child.stderr.on('data', (d) => {
      err += d.toString()
    })
    child.on('error', (e) => {
      resolve(`clipboard error: ${e.message}`)
    })
    if (cmd.input !== undefined) child.stdin.end(cmd.input)
    else child.stdin.end()
    child.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else resolve(`clipboard error (exit ${code}): ${err.trim() || 'unknown'}`)
    })
  })
}

export function readClipboard(cmd: ClipboardCommand): Promise<string> {
  return run(cmd)
}

export function writeClipboard(cmd: ClipboardCommand): Promise<string> {
  return run(cmd).then((r) => (r.startsWith('clipboard error') ? r : 'clipboard written'))
}
