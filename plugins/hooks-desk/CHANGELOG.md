# Changelog

## [0.1.0] - 2026-08-16

### 新增

- `tools/pre-execute` 危险命令门禁：递归删除/磁盘格式化/关机重启/数据外传拦截
- 策略纯函数 `evaluateCommand`（可单测），仅检查命令类工具
- node --test 冒烟测试（拦截 + 放行 + 参数提取）
