'use strict'

/**
 * 网络工具：空闲端口探测与端口就绪等待（纯 Node，可单测）
 */
const net = require('node:net')

const HOST = '127.0.0.1'
const DEFAULT_MAX_TRY = 20

/** 探测空闲端口（从 base 起逐个尝试，最多 maxTry 次） */
function findFreePort(base, maxTry = DEFAULT_MAX_TRY) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      if (port > base + maxTry) {
        reject(new Error('没有可用的空闲端口'))
        return
      }
      const srv = net.createServer()
      srv.once('error', () => tryPort(port + 1))
      srv.once('listening', () => {
        srv.close(() => resolve(port))
      })
      srv.listen(port, HOST)
    }
    tryPort(base)
  })
}

/** 等待指定端口被占用（即服务已监听）；超时抛错 */
function waitForPort(port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const probe = () => {
      const srv = net.createServer()
      srv.once('error', () => {
        // 端口已被占用 → 服务已就绪
        resolve()
      })
      srv.once('listening', () => {
        srv.close(() => {
          if (Date.now() > deadline) reject(new Error('等待 dsh 服务启动超时'))
          else setTimeout(probe, 300)
        })
      })
      srv.listen(port, HOST)
    }
    probe()
  })
}

module.exports = { findFreePort, waitForPort, HOST, DEFAULT_MAX_TRY }
