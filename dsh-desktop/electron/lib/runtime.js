'use strict'

/**
 * 运行时路径解析（纯函数，可单测）：
 * 根据打包状态/平台/资源目录，计算内置 node 可执行文件与 dsh bin 的绝对路径。
 */
const path = require('node:path')

/**
 * @param {object} opts
 * @param {boolean} opts.isPackaged  是否打包模式（app.isPackaged）
 * @param {string}  opts.platform    process.platform（win32/darwin/linux）
 * @param {string}  [opts.resourcesPath] 打包模式的 resources 目录
 * @param {string}  [opts.projectRoot]   开发模式的项目根（dsh-desktop/ 的上一级）
 * @returns {{nodeBin: string, dshBin: string, dshRuntime: string}}
 */
function resolveRuntimePaths({ isPackaged, platform, resourcesPath, projectRoot }) {
  let nodeRuntime
  let dshRuntime

  if (isPackaged) {
    nodeRuntime = path.join(resourcesPath, 'node-runtime')
    dshRuntime = path.join(resourcesPath, 'runtime')
  } else {
    nodeRuntime = path.join(projectRoot, '.tools', 'node-v24.19.0-win-x64')
    dshRuntime = path.join(projectRoot, 'runtime')
  }

  const nodeBin =
    platform === 'win32'
      ? path.join(nodeRuntime, 'node.exe')
      : path.join(nodeRuntime, 'bin', 'node')
  const dshBin = path.join(
    dshRuntime,
    'node_modules',
    '@deepseek-ai',
    'dsh',
    'lib',
    'bin.js',
  )

  return { nodeBin, dshBin, dshRuntime }
}

module.exports = { resolveRuntimePaths }
