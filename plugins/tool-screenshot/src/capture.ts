import { spawn } from 'node:child_process'
import path from 'node:path'

export interface CaptureCommand {
  command: string
  args: string[]
}

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

/** 平台无关的截屏命令构造（纯函数，可单测） */
export function buildCaptureCommand(
  platform: NodeJS.Platform,
  outPath: string,
  region?: Region,
): CaptureCommand {
  switch (platform) {
    case 'win32': {
      // PowerShell + System.Drawing CopyFromScreen；区域可选
      const script = region
        ? `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; ` +
          `$b = New-Object System.Drawing.Bitmap(${region.width},${region.height}); ` +
          `$g = [System.Drawing.Graphics]::FromImage($b); ` +
          `$g.CopyFromScreen(${region.x},${region.y},0,0,` +
          `(New-Object System.Drawing.Size(${region.width},${region.height}))); ` +
          `$b.Save('${outPath}',[System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $b.Dispose()`
        : `Add-Type -AssemblyName System.Windows.Forms,System.Drawing; ` +
          `$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; ` +
          `$bmp = New-Object System.Drawing.Bitmap($b.Width,$b.Height); ` +
          `$g = [System.Drawing.Graphics]::FromImage($bmp); ` +
          `$g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); ` +
          `$bmp.Save('${outPath}',[System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()`
      return { command: 'powershell', args: ['-NoProfile', '-Command', script] }
    }
    case 'darwin': {
      const args = ['-x', outPath] // -x: 无声
      if (region) {
        args.unshift('-R', `${region.x},${region.y},${region.width},${region.height}`)
      }
      return { command: 'screencapture', args }
    }
    case 'linux': {
      // gnome-screenshot 优先，import (ImageMagick) 兜底由调用方选择
      const args = ['-f', outPath]
      if (region) {
        args.unshift('-a', `${region.x},${region.y},${region.width},${region.height}`)
      }
      return { command: 'gnome-screenshot', args }
    }
    default:
      return { command: 'echo', args: ['[screenshot] unsupported platform'] }
  }
}

/** 执行截屏命令，成功返回输出文件路径 */
export function runCapture(cmd: CaptureCommand, outPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd.command, cmd.args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''
    child.stderr.on('data', (d) => {
      err += d.toString()
    })
    child.on('error', (e) => reject(new Error(`capture error: ${e.message}`)))
    child.on('close', (code) => {
      if (code === 0) resolve(outPath)
      else reject(new Error(`capture failed (exit ${code}): ${err.trim() || 'unknown'}`))
    })
  })
}

/** 生成输出文件路径（userData/screenshots/xxx.png） */
export function buildOutputPath(dir: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return path.join(dir, `screenshot-${stamp}.png`)
}
