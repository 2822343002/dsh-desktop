# @dsh-desktop/hooks-desk

危险命令门禁：在 `tools/pre-execute` 钩子上拦截**删除/格式化/关机/外传**类命令，
防止模型误执行破坏性操作。命中策略返回 `deny`（后续监听器无法撤销），
普通命令正常放行。

## 能力

- 递归删除拦截：`rm -rf /`、`rm -rf ~`、PowerShell `Remove-Item -Recurse`、Windows `del /s /q`
- 磁盘/分区拦截：`mkfs`、`format`、`fdisk`、`diskpart`、`parted`、`dd` 覆写设备
- 关机/重启拦截：`shutdown`、`reboot`、`halt`、`poweroff`
- 数据外传拦截：`curl -T/-F/--data`、`wget --post-file`、`scp/rsync` 到远程、`nc/netcat`
- 仅对命令执行类工具（bash/shell/terminal/pwsh/cmd 等）检查，文件工具不误伤

## 挂载

```yaml
# cordis.patch.yml
- insert:
    - id: hooks-desk
      name: '@dsh-desktop/hooks-desk'
```

## 配置

暂无可配置项；如需白名单/自定义模式，可在 `src/policy.ts` 的 `DANGEROUS_PATTERNS` 中扩展。

## 开发

```sh
npm install
npm run build   # tsc → lib/
npm test        # node --test
```

## Changelog

见 [CHANGELOG.md](./CHANGELOG.md)。
