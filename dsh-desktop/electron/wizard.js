'use strict'

// 向导渲染逻辑：欢迎 → 工作区 → API Key → preset → 完成
const $ = (id) => document.getElementById(id)
const pages = { 1: $('page1'), 2: $('page2'), 3: $('page3'), 4: $('page4') }
const labels = {
  1: '步骤 1 / 4 — 欢迎',
  2: '步骤 2 / 4 — 工作区',
  3: '步骤 3 / 4 — API Key',
  4: '步骤 4 / 4 — 运行模式',
}
let current = 1

function show(n) {
  current = n
  Object.entries(pages).forEach(([k, el]) => {
    el.style.display = Number(k) === n ? '' : 'none'
  })
  $('stepLabel').textContent = labels[n]
}

// —— 事件 ——
$('skipBtn').addEventListener('click', () => window.wizard.skip())
$('next1').addEventListener('click', () => show(2))
$('back2').addEventListener('click', () => show(1))
$('browseBtn').addEventListener('click', async () => {
  const dir = await window.wizard.selectDirectory()
  if (dir) $('workspaceInput').value = dir
})
$('next2').addEventListener('click', () => show(3))
$('back3').addEventListener('click', () => show(2))
$('next3').addEventListener('click', () => show(4))
$('back4').addEventListener('click', () => show(3))
$('finishBtn').addEventListener('click', async () => {
  const payload = {
    workspace: $('workspaceInput').value || null,
    apiKey: $('apiKeyInput').value || null,
    preset: $('presetSelect').value,
  }
  $('okMsg').style.display = ''
  $('finishBtn').disabled = true
  await window.wizard.finish(payload)
})
