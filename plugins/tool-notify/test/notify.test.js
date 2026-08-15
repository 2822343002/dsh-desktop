import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildNotifyCommand } from '../lib/notify.js'

test('win32 使用 powershell 弹气泡通知', () => {
  const cmd = buildNotifyCommand('win32', 'Build finished', 'All tests passed')
  assert.equal(cmd.command, 'powershell')
  assert.ok(cmd.args.join(' ').includes('ShowBalloonTip'))
  assert.ok(cmd.args.join(' ').includes('Build finished'))
})

test('darwin 使用 osascript 通知', () => {
  const cmd = buildNotifyCommand('darwin', 'Title', 'Message')
  assert.equal(cmd.command, 'osascript')
  assert.ok(cmd.args.join(' ').includes('display notification'))
})

test('linux 使用 notify-send', () => {
  const cmd = buildNotifyCommand('linux', 'Title', 'Message')
  assert.equal(cmd.command, 'notify-send')
  assert.deepEqual(cmd.args, ['Title', 'Message'])
})

test('未知平台回退为 echo 且不崩溃', () => {
  const cmd = buildNotifyCommand('freebsd', 'T', 'M')
  assert.equal(cmd.command, 'echo')
})

test('移除危险字符防止命令注入', () => {
  const cmd = buildNotifyCommand('linux', 'a"b', "c'd")
  assert.equal(cmd.args[0], 'ab')
  assert.equal(cmd.args[1], 'cd')
})
