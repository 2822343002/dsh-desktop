import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildReadCommand, buildWriteCommand } from '../lib/clipboard.js'

test('win32 读剪贴板用 Get-Clipboard', () => {
  const cmd = buildReadCommand('win32')
  assert.equal(cmd.command, 'powershell')
  assert.ok(cmd.args.join(' ').includes('Get-Clipboard'))
})

test('darwin 读剪贴板用 pbpaste', () => {
  const cmd = buildReadCommand('darwin')
  assert.equal(cmd.command, 'pbpaste')
})

test('linux 读剪贴板用 xclip', () => {
  const cmd = buildReadCommand('linux')
  assert.equal(cmd.command, 'xclip')
  assert.ok(cmd.args.join(' ').includes('clipboard'))
})

test('win32 写剪贴板用 Set-Clipboard 且输入经 stdin', () => {
  const cmd = buildWriteCommand('win32', 'hello')
  assert.equal(cmd.command, 'powershell')
  assert.ok(cmd.args.join(' ').includes('Set-Clipboard'))
  assert.equal(cmd.input, 'hello')
})

test('darwin 写剪贴板用 pbcopy 且输入经 stdin', () => {
  const cmd = buildWriteCommand('darwin', 'hi')
  assert.equal(cmd.command, 'pbcopy')
  assert.equal(cmd.input, 'hi')
})

test('未知平台读回退为 echo 不崩溃', () => {
  const cmd = buildReadCommand('freebsd')
  assert.equal(cmd.command, 'echo')
})

test('写入内容经 stdin 传递避免命令注入', () => {
  // 内容含特殊字符也不进入 argv（纯 stdin）
  const evil = 'a"; rm -rf /; b'
  const cmd = buildWriteCommand('linux', evil)
  assert.equal(cmd.input, evil)
  assert.ok(!cmd.args.join(' ').includes(evil))
})
