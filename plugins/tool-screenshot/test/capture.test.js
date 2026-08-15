import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { buildCaptureCommand, buildOutputPath } from '../lib/capture.js'

test('win32 全屏截屏用 PowerShell CopyFromScreen', () => {
  const cmd = buildCaptureCommand('win32', 'C:/tmp/s.png')
  assert.equal(cmd.command, 'powershell')
  assert.ok(cmd.args.join(' ').includes('CopyFromScreen'))
})

test('win32 区域截屏包含区域参数', () => {
  const cmd = buildCaptureCommand('win32', 'C:/tmp/s.png', { x: 10, y: 20, width: 100, height: 50 })
  const text = cmd.args.join(' ')
  assert.ok(text.includes('CopyFromScreen(10,20'))
  assert.ok(text.includes('Size(100,50)'))
})

test('darwin 全屏截屏用 screencapture -x', () => {
  const cmd = buildCaptureCommand('darwin', '/tmp/s.png')
  assert.equal(cmd.command, 'screencapture')
  assert.ok(cmd.args.includes('-x'))
  assert.ok(cmd.args.includes('/tmp/s.png'))
})

test('darwin 区域截屏带 -R', () => {
  const cmd = buildCaptureCommand('darwin', '/tmp/s.png', { x: 1, y: 2, width: 3, height: 4 })
  assert.ok(cmd.args.includes('-R'))
  assert.ok(cmd.args.includes('1,2,3,4'))
})

test('linux 用 gnome-screenshot -f', () => {
  const cmd = buildCaptureCommand('linux', '/tmp/s.png')
  assert.equal(cmd.command, 'gnome-screenshot')
  assert.ok(cmd.args.includes('-f'))
})

test('未知平台回退 echo 不崩溃', () => {
  const cmd = buildCaptureCommand('freebsd', '/tmp/s.png')
  assert.equal(cmd.command, 'echo')
})

test('buildOutputPath 生成带时间戳的 png 路径', () => {
  const p = buildOutputPath('C:/shots')
  assert.equal(path.extname(p), '.png')
  assert.ok(p.includes('shots'))
  assert.ok(p.includes('screenshot-'))
})
