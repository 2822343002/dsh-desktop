'use strict'

/**
 * dsh-desktop 主进程
 *
 * 职责：
 *  - 单实例锁（重复启动时聚焦已有窗口）
 *  - 探测空闲端口，spawn 内置 node 运行 `dsh --profile web --port <port>`
 *  - 等待端口就绪后，BrowserWindow 加载官方 Web UI
 *  - 退出时 dispose dsh 进程；启动失败弹窗提示
 *
 * 运行时布局：
 *  打包后（resources 目录）：
 *    resources/node-runtime/  → portable Node.js（node 可执行文件）
 *    resources/runtime/       → dsh 运行时（node_modules、@deepseek-ai/dsh）
 *    userData/                → DSH_HOME（密钥、会话、配置）
 *  开发模式（项目根相对路径）：
 *    ../.tools/node-v24.19.0-win-x64/  → node
 *    ../runtime/                       → dsh 运行时
 */
const { app, BrowserWindow, dialog } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
const { findFreePort, waitForPort } = require('./lib/net-utils')
const { resolveRuntimePaths } = require('./lib/runtime')

const DSH_PORT_DEFAULT = 3080
const DSH_WAIT_TIMEOUT_MS = 90 * 1000

// —— 文件日志：GUI 程序 stdout 不可见，写入 userData/dsh-desktop.log ——
const LOG_FILE = path.join(app.getPath('userData'), 'dsh-desktop.log')
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}`
  try {
    fs.appendFileSync(LOG_FILE, line + '\n')
  } catch (_) {
    /* ignore */
  }
  console.log(line)
}

/** 定位 node 可执行文件与 dsh bin（区分开发/打包模式） */
function resolveRuntime() {
  const projectRoot = path.resolve(__dirname, '..', '..')
  return resolveRuntimePaths({
    isPackaged: app.isPackaged,
    platform: process.platform,
    resourcesPath: process.resourcesPath,
    projectRoot,
  })
}

let dshProcess = null
let mainWindow = null

/** 启动 dsh web 服务器 */
async function startDsh(port) {
  const { nodeBin, dshBin } = resolveRuntime()
  const dshHome = app.getPath('userData')

  if (!fs.existsSync(nodeBin)) {
    throw new Error(`未找到内置 Node 运行时：${nodeBin}`)
  }
  if (!fs.existsSync(dshBin)) {
    throw new Error(`未找到 dsh 运行时：${dshBin}`)
  }

  log('[dsh-desktop] DSH_HOME =', dshHome)
  const args = [dshBin, '--profile', 'web', '--port', String(port), '--host', '127.0.0.1']
  dshProcess = spawn(nodeBin, args, {
    env: {
      ...process.env,
      DSH_HOME: dshHome,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  dshProcess.stdout.on('data', (d) => {
    const line = d.toString().trim()
    if (line) log('[dsh]', line)
  })
  dshProcess.stderr.on('data', (d) => {
    const line = d.toString().trim()
    if (line) log('[dsh]', line)
  })
  dshProcess.on('error', (err) => {
    log('[dsh-desktop] spawn dsh 失败：', err)
  })
  dshProcess.on('exit', (code, signal) => {
    log('[dsh] exited', { code, signal })
    dshProcess = null
  })
  return dshProcess
}

async function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'DeepSeek Harness Desktop',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  await mainWindow.loadURL(url)
}

// —— 单实例锁 ——
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    try {
      const port = await findFreePort(DSH_PORT_DEFAULT)
      log('[dsh-desktop] 使用端口', port)
      await startDsh(port)
      await waitForPort(port, DSH_WAIT_TIMEOUT_MS)
      await createWindow(`http://127.0.0.1:${port}/`)
    } catch (err) {
      log('[dsh-desktop] 启动失败：', err)
      dialog.showErrorBox('启动失败', String((err && err.message) || err))
      app.quit()
    }
  })

  app.on('window-all-closed', () => {
    app.quit()
  })

  app.on('before-quit', () => {
    if (dshProcess) {
      try {
        dshProcess.kill()
      } catch (_) {
        /* ignore */
      }
    }
  })
}
