# Changelog

## [0.1.0] - 2026-08-16

### 新增

- `take_screenshot` 截屏工具（win32/macOS/Linux），全屏/区域
- 图片经 `ctx.attachments.saveImage` 注册为 `ImageBlock` 附件
- 截图落盘 `$DSH_HOME/screenshots/`，结果含路径/尺寸/字节数
- node --test 冒烟测试（平台命令构造 + 区域参数 + 输出路径）
