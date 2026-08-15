'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const net = require('node:net')
const { findFreePort, waitForPort, HOST } = require('../electron/lib/net-utils')

function listen(port) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(port, HOST, () => resolve(srv))
  })
}

function close(srv) {
  return new Promise((resolve) => srv.close(resolve))
}

test('findFreePort 返回可监听的空闲端口', async () => {
  const port = await findFreePort(33080)
  assert.ok(Number.isInteger(port) && port >= 33080 && port <= 33100)
  const srv = await listen(port)
  await close(srv)
})

test('findFreePort 跳过被占用端口', async () => {
  const blocker = await listen(33090)
  try {
    const port = await findFreePort(33090)
    assert.notEqual(port, 33090)
    assert.ok(port >= 33090)
  } finally {
    await close(blocker)
  }
})

test('waitForPort 在端口被占用时立即解析', async () => {
  const srv = await listen(33100)
  try {
    await waitForPort(33100, 2000)
  } finally {
    await close(srv)
  }
})

test('waitForPort 在超时后拒绝', async () => {
  await assert.rejects(waitForPort(33110, 700), /等待 dsh 服务启动超时/)
})
