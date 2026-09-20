# FeishuSync 项目结构

## 运行入口

- `index.js`：启动和停止认证、同步进程。
- `package.json`：统一命令入口，优先使用 `npm run ...`。
- `config.json`：本机配置，不提交到 Git。
- `config.example.json`：配置模板。

## 代码目录

- `api/`：飞书 API、映射清单、移动事务和同步底层能力。
- `scripts/`：可执行脚本和常驻进程。这里的脚本由 `index.js` 或 npm 命令调用。
- `tests/`：自动化测试。
- `tools/`：一次性诊断、维护工具，不参与常驻同步。

## 运维目录

- `ops/startup/`：系统开机自启入口，只负责拉起 watchdog。
- `ops/launcher/`：人工操作菜单，适合快速启动、停止、查看状态或执行一次同步。
- `logs/`：运行日志和启动日志。

## 数据和归档

- `wikid/`：本地 Markdown 镜像和 `.feishu-sync.json` 映射文件。
- `archive/`：历史备份、旧映射、旧配置和一次性维护脚本，不参与运行。
- `node_modules/`：npm 依赖，不手工修改。

## 常用操作

```text
日常启动       npm run start
停止服务       npm run stop
查看状态       npm run status
一次本地同步   npm run update
交互式操作     ops/launcher/feishusync.bat
```

不要直接删除 `wikid/.feishu-sync.json`，它保存本地文件与飞书文档的身份映射。
