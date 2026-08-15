import { spawn } from 'node:child_process'

export interface NotifyCommand {
  command: string
  args: string[]
}

/** 平台无关的通知命令构造（纯函数，可单测） */
export function buildNotifyCommand(
  platform: NodeJS.Platform,
  title: string,
  message: string,
): NotifyCommand {
  const safeTitle = title.replace(/["'`$\\]/g, '')
  const safeMsg = message.replace(/["'`$\\]/g, '')
  switch (platform) {
    case 'win32':
      return {
        command: 'powershell',
        args: [
          '-NoProfile',
          '-Command',
          `[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; ` +
            `$n = New-Object System.Windows.Forms.NotifyIcon; ` +
            `$n.Icon = [System.Drawing.SystemIcons]::Information; ` +
            `$n.BalloonTipTitle = '${safeTitle}'; ` +
            `$n.BalloonTipText = '${safeMsg}'; ` +
            `$n.Visible = $true; $n.ShowBalloonTip(5000); ` +
            `Start-Sleep -Milliseconds 6000; $n.Dispose()`,
        ],
      }
    case 'darwin':
      return {
        command: 'osascript',
        args: ['-e', `display notification "${safeMsg}" with title "${safeTitle}"`],
      }
    case 'linux':
      return {
        command: 'notify-send',
        args: [safeTitle, safeMsg],
      }
    default:
      return { command: 'echo', args: [`[notify] ${safeTitle}: ${safeMsg}`] }
  }
}

/** 执行通知命令；返回描述性结果（不抛错） */
export function sendNotification(cmd: NotifyCommand): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(cmd.command, cmd.args, {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let err = ''
    child.stderr.on('data', (d) => {
      err += d.toString()
    })
    child.on('error', (e) => {
      resolve(`notify failed: ${e.message}`)
    })
    child.on('close', (code) => {
      if (code === 0) resolve('notification sent')
      else resolve(`notify failed (exit ${code}): ${err.trim() || 'unknown'}`)
    })
  })
}
