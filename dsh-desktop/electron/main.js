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
const { app, BrowserWindow, dialog, Tray, Menu } = require('electron')
const { autoUpdater } = require('electron-updater')
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

/** portable 二次启动缓存目录名（与 build/portable.nsi 中一致） */
const CACHE_DIR_NAME = 'dsh-desktop-cache'
const CACHE_VERSION_FILE = 'cache-version.txt'
const CACHE_REBUILD_FLAG = 'rebuild.flag'

/**
 * portable 缓存播种/校验：与自定义 NSIS 模板（build/portable.nsi）配合。
 * - 命中：缓存 exe 存在且版本一致 → 直接复用，跳过 7z 自解压。
 * - 版本不匹配且当前运行在临时解压目录 → 删除旧缓存并重建为新版本。
 * - 异常状态（运行在旧缓存内）→ 写入 rebuild.flag，通知 NSIS 下次走解压流程。
 */
async function seedPortableCache() {
  try {
    // 仅 portable 模式（NSIS 设置该环境变量）才需要
    if (!process.env.PORTABLE_EXECUTABLE_FILE) return false
    const cacheRoot = path.join(app.getPath('appData'), CACHE_DIR_NAME)
    const cacheExe = path.join(cacheRoot, 'DeepSeek Harness Desktop.exe')
    const versionFile = path.join(cacheRoot, CACHE_VERSION_FILE)
    const rebuildFlag = path.join(cacheRoot, CACHE_REBUILD_FLAG)
    const srcDir = path.dirname(process.execPath)

    if (fs.existsSync(cacheExe)) {
      const cachedVersion = fs.existsSync(versionFile)
        ? fs.readFileSync(versionFile, 'utf8').trim()
        : ''
      if (cachedVersion === app.getVersion() && !fs.existsSync(rebuildFlag)) {
        log('[dsh-desktop] portable 缓存命中，跳过自解压')
        return true
      }
      // 版本不匹配：仅当运行在临时解压目录（非缓存自身）时才能重建
      if (path.resolve(srcDir) !== path.resolve(cacheRoot)) {
        log('[dsh-desktop] portable 缓存版本不匹配，重建:', cachedVersion, '->', app.getVersion())
        fs.rmSync(cacheRoot, { recursive: true, force: true })
        fs.mkdirSync(cacheRoot, { recursive: true })
        await fs.promises.cp(srcDir, cacheRoot, { recursive: true })
        fs.writeFileSync(versionFile, app.getVersion())
        log('[dsh-desktop] portable 缓存已重建:', cacheRoot)
        return true
      }
      // 运行在旧缓存内且版本不匹配（异常）：标记重建，下次走解压流程
      try {
        fs.writeFileSync(rebuildFlag, 'rebuild')
        log('[dsh-desktop] portable 缓存标记重建（运行中无法自删）')
      } catch (_) {
        /* ignore */
      }
      return false
    }

    // 无缓存：首次播种
    fs.mkdirSync(cacheRoot, { recursive: true })
    await fs.promises.cp(srcDir, cacheRoot, { recursive: true })
    fs.writeFileSync(versionFile, app.getVersion())
    log('[dsh-desktop] portable 缓存已播种:', cacheRoot)
    return true
  } catch (err) {
    log('[dsh-desktop] 缓存播种失败:', err && err.message)
    return false
  }
}

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

async function createWindow() {
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
  mainWindow.on('close', (e) => {
    // 非退出时关闭窗口 → 隐藏到托盘（dsh 后台继续运行）
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  // 页面由启动流程统一加载 dsh Web UI
}

// —— 系统托盘：最小化到托盘、托盘菜单（打开/退出） ——
let tray = null
let isQuitting = false

function showMainWindow() {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function createTray() {
  const icon = path.join(__dirname, '..', 'build', 'icon.png')
  tray = new Tray(icon)
  tray.setToolTip('DeepSeek Harness Desktop')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '打开主界面', click: showMainWindow },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on('click', showMainWindow)
}

// —— 自动更新（electron-updater） ——
let updaterChecked = false

function setupAutoUpdater() {
  if (!app.isPackaged) {
    // 开发模式不检查更新
    return
  }
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = { info: (...a) => log('[updater]', ...a), warn: (...a) => log('[updater]', ...a), error: (...a) => log('[updater]', ...a) }

  autoUpdater.on('update-available', async (info) => {
    log('[updater] 发现新版本', info && info.version)
    try {
      const r = await dialog.showMessageBox({
        type: 'info',
        title: '发现新版本',
        message: `发现新版本 ${info.version}，是否下载？`,
        buttons: ['下载', '稍后'],
        defaultId: 0,
      })
      if (r.response === 0) {
        await autoUpdater.downloadUpdate()
      }
    } catch (err) {
      log('[updater] 下载提示失败:', err && err.message)
    }
  })

  autoUpdater.on('update-downloaded', async (info) => {
    log('[updater] 更新已下载', info && info.version)
    try {
      const r = await dialog.showMessageBox({
        type: 'info',
        title: '更新就绪',
        message: `新版本 ${info.version} 已下载，重启应用以完成更新。`,
        buttons: ['立即重启', '稍后'],
        defaultId: 0,
      })
      if (r.response === 0) {
        isQuitting = true
        autoUpdater.quitAndInstall()
      }
    } catch (err) {
      log('[updater] 安装提示失败:', err && err.message)
    }
  })

  autoUpdater.on('error', (err) => {
    log('[updater] 检查更新失败:', err && err.message)
  })

  // 启动后延迟检查一次
  setTimeout(() => {
    if (updaterChecked) return
    updaterChecked = true
    autoUpdater.checkForUpdates().catch((err) => log('[updater] check error:', err && err.message))
  }, 10 * 1000)
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
      await createWindow()
      await mainWindow.loadURL(`http://127.0.0.1:${port}/`)
      createTray()
      setupAutoUpdater()
      // 后台播种 portable 缓存（不阻塞 UI；仅 portable 模式生效）
      seedPortableCache()
    } catch (err) {
      log('[dsh-desktop] 启动失败：', err)
      dialog.showErrorBox('启动失败', String((err && err.message) || err))
      app.quit()
    }
  })

  // 关闭窗口 → 隐藏到托盘常驻，不退出应用（dsh 后台继续运行）
  app.on('window-all-closed', () => {
    /* 常驻托盘；退出走托盘菜单或系统退出 */
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
