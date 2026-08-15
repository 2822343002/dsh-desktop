'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// 向导页与渲染进程可用的桥接能力（contextIsolation 下安全暴露）
contextBridge.exposeInMainWorld('wizard', {
  // 选择工作区目录（返回绝对路径或 null）
  selectDirectory: () => ipcRenderer.invoke('wizard:select-directory'),
  // 完成向导：提交配置（apiKey/preset/workspace）
  finish: (payload) => ipcRenderer.invoke('wizard:finish', payload),
  // 取消向导（仍进入主界面）
  skip: () => ipcRenderer.invoke('wizard:skip'),
  // 读取当前应用信息（版本等）
  appInfo: () => ipcRenderer.invoke('wizard:app-info'),
})
