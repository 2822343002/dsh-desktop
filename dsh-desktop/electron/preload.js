'use strict'

// 预加载脚本：向渲染进程暴露最小桥接（背景设置入口等）。
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dshBg', {
  select: () => ipcRenderer.invoke('bg:select'),
  reset: () => ipcRenderer.invoke('bg:reset'),
})
