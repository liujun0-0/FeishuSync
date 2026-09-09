# FeishuSync

飞书 Wiki ↔ 本地 Markdown 双向同步工具。

## 功能

- **跨平台**：支持 Windows / macOS / Linux（Node.js 18+）
- **双向同步**：本地 `wikid/` 目录与飞书 Wiki 空间自动同步
- **Mermaid 画板**：` ```mermaid ` 代码块自动渲染为飞书画板块（block_type=40）
- **幽灵副本防护**：三重守卫防止重复文件产生
- **Token 自愈**：auth 自动续期，token 过期时自动重试
- **崩溃恢复**：watchdog 监督 auth + sync 进程，崩溃后 3 秒自动拉起

## 快速开始

### 1. 安装依赖

```bash
git clone https://github.com/liujun0-0/FeishuSync.git
cd FeishuSync
npm install
```

### 2. 配置

复制配置模板并填入你的飞书应用信息：

```bash
cp config.example.json config.json
```

编辑 `config.json`：

```json
{
  "tokenPath": "./user-token.txt",
  "wikiSpaceId": "你的飞书知识库空间ID",
  "auth": {
    "clientId": "cli_你的应用ID",
    "clientSecret": "你的应用密钥"
  },
  "sync": {
    "folderPath": "wikid",
    "pollIntervalSeconds": 30,
    "initialSync": true
  }
}
```

**获取配置值：**
- `auth.clientId` / `auth.clientSecret`：飞书开放平台 → 你的应用 → 凭证与基础信息
- `wikiSpaceId`：飞书知识库 → 知识库设置 → 空间 ID（URL 里的那串 ID）

### 3. 首次授权

```bash
npm run auth
```

浏览器会自动打开飞书授权页面，点击"授权"即可。授权后 token 会保存到 `user-token.txt`，后续自动续期（约 30 天需要重新授权一次）。

### 4. 启动同步

```bash
npm start
```

这会启动三个进程：
- `auth.js` — token 自动续期（每 84 分钟）
- `sync.js` — 常驻同步主进程（WebSocket + 轮询）
- `watchdog.js` — 进程监督（崩溃后自动重启）

### 5. 开机自启

**Windows：**

将 `_autostart_watchdog.cmd` 的快捷方式放到启动文件夹：

```powershell
shell:startup
Copy-Item "_autostart_watchdog.cmd" "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\"
```

**macOS（launchd）：**

```bash
chmod +x _autostart_watchdog.sh
cp _autostart_watchdog.sh ~/Library/LaunchAgents/feishu-sync-watchdog.sh
# 或创建 launchd plist（更标准）
```

**Linux（systemd）：**

```bash
chmod +x _autostart_watchdog.sh
# 方式 1：直接运行
./_autostart_watchdog.sh

# 方式 2：systemd 用户服务（推荐）
cp feishu-sync-watchdog.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable feishu-sync-watchdog
systemctl --user start feishu-sync-watchdog
```

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm start` | 启动守护模式（auth + sync + watchdog） |
| `npm run stop` | 停止所有进程 |
| `npm run auth` | 手动重新授权 |
| `npm run upload <md>` | 上传单个 markdown 到飞书 |
| `npm run download <docId>` | 从飞书下载文档 |
| `npm run update` | 单次全量同步 |
| `npm run sync` | 常驻同步（不带 watchdog） |
| `npm run list` | 列出 wiki 空间树 |
| `npm run fetch <docId>` | 拉取文档元数据和块 JSON |

## 目录结构

```
FeishuSync/
├── config.json           ← 你的配置（不提交到 git）
├── config.example.json   ← 配置模板
├── user-token.txt        ← OAuth token（不提交）
├── .feishu-sync-refresh-token  ← refresh token（不提交）
├── wikid/                ← 本地 Markdown 镜像（不提交）
│   ├── .feishu-sync.json ← manifest（docId↔文件映射）
│   └── 飞书深诺文档集合/
│       ├── 技术分享.md
│       └── 飞书深诺技术文档/
│           ├── BSP接口转发方案-v5.1.md
│           └── ...
├── api/                  ← 核心模块
│   ├── feishu.js         ← 飞书 API 封装
│   ├── feishu-md.js      ← Markdown ↔ 飞书块转换
│   ├── helpers.js        ← 工具函数
│   └── merge.js          ← 冲突合并
├── scripts/              ← 脚本
│   ├── auth.js           ← OAuth 认证
│   ├── sync.js           ← 同步主进程
│   ├── watchdog.js       ← 进程监督
│   ├── upload.js         ← 单文件上传
│   ├── download.js       ← 单文件下载
│   └── cleanup-stubs.mjs ← 幽灵副本清理
├── index.js              ← start/stop 入口
├── package.json
└── _autostart_watchdog.cmd  ← Windows 开机自启
```

## 故障排查

### 查看日志

```bash
# 同步状态
tail logs/sync.log

# auth 状态
tail logs/auth.log

# watchdog 状态
tail logs/watchdog.log
```

### 常见问题

| 问题 | 解决 |
|---|---|
| sync.log 报 `99991677` | token 过期，等 auth 自动续期或 `npm run auth` |
| 浏览器弹出授权页面 | refresh_token 过期（约 30 天一次），点授权即可 |
| 出现 `-N` 后缀文件 | 运行 `node scripts/cleanup-stubs.mjs --dry-run` 检查 |
| sync 崩溃 | watchdog 会自动重启，检查 `logs/watchdog.log` |
| 文件在根目录不在子目录 | sync 设计限制，可手动移动文件并更新 manifest |

## 支持的图表格式

| 格式 | 飞书渲染 |
|---|---|
| `flowchart` / `graph` | 画板块（block_type=40） |
| `sequenceDiagram` | 画板块 |
| `classDiagram` / `stateDiagram` / `erDiagram` | 画板块 |
| `gantt` / `pie` / `mindmap` / `journey` | 画板块 |
| `plantuml` / `kroki` / `dot` | 代码块（源码保留） |

检测方式：语言标签 `mermaid` 或裸 ` ``` ` 块首行匹配关键词。

## License

MIT
