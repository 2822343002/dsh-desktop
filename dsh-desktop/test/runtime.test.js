'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { resolveRuntimePaths } = require('../electron/lib/runtime')

test('打包模式 win32：node 指向 node-runtime/node.exe', () => {
  const r = resolveRuntimePaths({
    isPackaged: true,
    platform: 'win32',
    resourcesPath: 'C:/app/resources',
  })
  assert.equal(r.nodeBin, path.join('C:/app/resources', 'node-runtime', 'node.exe'))
  assert.equal(r.dshRuntime, path.join('C:/app/resources', 'runtime'))
  assert.ok(r.dshBin.endsWith(path.join('node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')))
})

test('打包模式 posix：node 指向 node-runtime/bin/node', () => {
  const r = resolveRuntimePaths({
    isPackaged: true,
    platform: 'darwin',
    resourcesPath: '/opt/app/resources',
  })
  assert.equal(r.nodeBin, path.join('/opt/app/resources', 'node-runtime', 'bin', 'node'))
})

test('开发模式：使用项目根相对路径', () => {
  const r = resolveRuntimePaths({
    isPackaged: false,
    platform: 'linux',
    projectRoot: '/home/dev/dsh',
  })
  assert.equal(r.nodeBin, path.join('/home/dev/dsh', '.tools', 'node-v24.19.0-win-x64', 'bin', 'node'))
  assert.equal(r.dshRuntime, path.join('/home/dev/dsh', 'runtime'))
})
