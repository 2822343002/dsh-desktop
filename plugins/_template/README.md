# @dsh-desktop/<name>

一句话描述插件能力。

## 能力

- 能力 1
- 能力 2

## 配置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `xxx` | string | `''` | 配置说明 |

## 挂载

```yaml
# cordis.patch.yml
- insert:
    - id: <name>
      name: '@dsh-desktop/<name>'
```

## 开发

```sh
npm install
npm run build   # tsc → lib/
npm test        # node --test
```
