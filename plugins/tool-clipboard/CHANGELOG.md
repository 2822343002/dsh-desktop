# Changelog

## [0.1.0] - 2026-08-16

### 新增

- `clipboard_read` / `clipboard_write` 系统剪贴板工具（win32/macOS/Linux）
- 写入内容经 stdin 传递，防命令注入
- node --test 冒烟测试（平台命令构造 + 注入防护）
