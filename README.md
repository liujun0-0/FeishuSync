# FeishuSync

飞书 Wiki ↔ 本地 Markdown 双向同步工具。

## 功能

- **跨平台**：支持 Windows / macOS / Linux（Node.js 18+）
- **本地优先同步**：默认只将本地 `wikid/` 的新增、修改、移动同步到飞书
- **可选双向同步**：必须显式运行双向命令，才会处理飞书 → 本地
- **Markdown 转换**：Markdown 语法 ↔ 飞书文档块格式双向转换
- **Mermaid 画板**：` ```mermaid ` 代码块自动渲染为飞书画板块（block_type=40）
- **表格支持**：Markdown 表格转飞书表格块，空单元格自动占位（避免 API 报错）
- **图片上传**：Markdown 图片自动上传到飞书云空间
- **幽灵副本防护**：三重守卫防止重复文件产生
- **Token 自愈**：auth 自动续期，token 过期时自动重试
- **崩溃恢复**：watchdog 监督 auth + sync 进程，崩溃后 3 秒自动拉起
- **冲突处理**：有共同基线时自动合并独立修改；无法安全合并时保留 `.remote.md` 副本

## 支持的 Markdown 语法

| 语法 | 飞书渲染 |
|---|---|
| `# 标题` ~ `######` | heading1-6 |
| 段落 / `> 引用` | text / quote 块 |
| `- 列表` / `1. 列表` | bullet / ordered 块 |
| `- [ ] / - [x]` | todo 复选框 |
| ` ```js ` / ` ```python ` 等 | 代码块（语法高亮）|
| `---` | 分隔线 |
| **粗体** / *斜体* / `行内代码` | 文本样式 |
| `[链接](url)` | 超链接 |
| `![alt](url)` | 图片（自动上传到飞书）|
| `\| 表格 \|` / `<table>` | 飞书表格 |
| ` ```mermaid ` | 飞书画板块（见下方） |

## 支持的图表格式

| 格式 | 飞书渲染 | 检测方式 |
|---|---|---|
| `flowchart` / `graph` | 画板块 | 语言标签 + 首行关键词 |
| `sequenceDiagram` | 画板块 | 首行关键词 |
| `classDiagram` / `stateDiagram` / `erDiagram` | 画板块 | 首行关键词 |
| `gantt` / `pie` / `mindmap` / `journey` | 画板块 | 首行关键词 |
| `gitGraph` / `requirement` / `quadrant` | 画板块 | 首行关键词 |
| `plantuml` / `kroki` / `dot` | 代码块（源码保留）| — |

检测方式：
1. 语言标签 ` ```mermaid ` → 直接识别
2. 裸 ` ``` ` 块（无语言标签）→ 检查首行是否匹配已知关键词（`flowchart`/`sequenceDiagram`/`classDiagram` 等）

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
    "initialSync": true,
    "documentPolicies": {
      "paths": {
        "重要文档/只读远程.md": "remote-to-local",
        "项目说明.md": "local-to-remote",
        "共享设计.md": "merge"
      },
      "docIds": {
        "doccn_example": "bidirectional"
      }
    }
  }
}
```

### 文档级同步策略

`sync.documentPolicies` 可覆盖默认同步策略。优先按相对路径匹配，其次按飞书 `docId` 匹配；未配置的文档继续使用默认策略。

支持的策略：

- `bidirectional`：本地和飞书均可修改
- `remote-to-local`：线上优先，冲突时覆盖本地
- `local-to-remote`：本地优先，冲突时覆盖线上
- `merge`：双方修改时优先进行正文三方合并

**获取配置值：**
- `auth.clientId` / `auth.clientSecret`：飞书开放平台 → 你的应用 → 凭证与基础信息
- `wikiSpaceId`：飞书知识库 → 知识库设置 → 空间 ID（URL 里的那串 ID）

### 3. 飞书应用权限

在飞书开放平台 → 你的应用 → 权限管理，确保开通以下权限：

| 权限 | 用途 |
|---|---|
| `docx:document` | 读写文档内容 |
| `docs:doc` | 读写旧版文档 |
| `drive:drive` | 云空间文件操作（图片上传等）|
| `wiki:wiki` | 读写知识库节点 |
| `offline_access` | 获取 refresh_token（长期授权）|

### 4. 首次授权

```bash
npm run auth
```

浏览器会自动打开飞书授权页面，点击"授权"即可。授权后 token 会保存到 `user-token.txt`，后续自动续期（约 30 天需要重新授权一次）。

### 5. 启动同步

```bash
npm start
```

默认启动本地优先同步：
- `auth.js` — token 自动续期（每 84 分钟刷新一次）
- `sync.js` — 常驻本地监听进程，将本地变更上传到飞书
- `watchdog.js` — 进程监督（崩溃后 3 秒自动拉起）

如需一次性让本地与飞书重新对账，或启用飞书 → 本地同步，必须显式运行：

```bash
npm run sync:bidirectional
```

双向模式会处理远程新增、远程修改、远程移动及冲突；默认模式不会因为远程状态变化而覆盖或删除本地文件。

### 6. 开机自启

**Windows：**

```powershell
shell:startup
Copy-Item "_autostart_watchdog.cmd" "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\"
```

**macOS：**

```bash
chmod +x _autostart_watchdog.sh
cp _autostart_watchdog.sh ~/Library/LaunchAgents/feishu-sync-watchdog.sh
```

**Linux：**

```bash
chmod +x _autostart_watchdog.sh
# 方式 1：手动
./_autostart_watchdog.sh

# 方式 2：systemd（推荐）
cp feishu-sync-watchdog.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now feishu-sync-watchdog
```

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm start` | 启动默认本地优先守护模式 |
| `npm run stop` | 停止所有进程 |
| `npm run auth` | 手动重新授权 |
| `npm run upload <md>` | 上传单个 markdown 到飞书（创建新文档） |
| `npm run download <docId>` | 从飞书下载文档为 markdown |
| `npm run update` | 单次双向全量对账（含删除保护） |
| `npm run sync` | 常驻同步（按配置模式运行） |
| `npm run sync:bidirectional` | 显式启动双向同步 |
| `npm run local-watch` | 仅监听本地并上传变更 |
| `npm run list` | 列出 wiki 空间树 |
| `npm run fetch <docId>` | 拉取文档元数据和块 JSON |
| `npm run convert to-md <json>` | 飞书 JSON → Markdown |
| `npm run convert to-feishu <md>` | Markdown → 飞书 JSON |

## 同步机制

FeishuSync 使用分模式同步策略：

| 层 | 机制 | 延迟 |
|---|---|---|
| 本地优先模式 | `fs.watch` 监听 `wikid/`，仅上传本地变更 | 即时 |
| 双向模式 | WebSocket + 轮询 + 本地监听 | 秒级 / 30 秒 |

**同步流程：**
1. 默认：本地文件新增/修改/移动 → `fs.watch` 检测 → 按 identity/hash 上传或移动飞书文档
2. 双向模式：飞书文档修改 → WebSocket/轮询 → 下载或合并到本地
3. 双向模式启动时执行全量比对 → 处理所有差异

**冲突处理：**
- 本地修改 + 远程未改 → 上传
- 远程修改 + 本地未改 → 下载
- 双方修改不同正文行 → 自动三方合并
- 同一正文区域同时修改 → 远程版本保存为 `.remote.md`，本地版本保留

**上传去重：**
- `npm run upload` 时自动检测 wiki 里有没有同名文档
- 有同名 → 复用现有 docId 并更新内容（不创建新 import-mt* 残留）
- 无同名 → 创建新文档

**删除保护机制：**
- `.feishu-sync-soft-trash/` 及其内容永远不会同步到飞书
- 双向扫描发现本地文件消失时，先在 manifest 标记 `pendingDeleteAt`
- 文件连续缺失 7 天后才允许删除远程文档
- 7 天内恢复本地文件 → 自动取消远程删除
- 防止工具/脚本误删无法挽回

## 目录结构

```
FeishuSync/
├── config.json              ← 你的配置（不提交到 git）
├── config.example.json      ← 配置模板
├── user-token.txt           ← OAuth token（不提交）
├── .feishu-sync-refresh-token  ← refresh token（不提交）
├── wikid/                   ← 本地 Markdown 镜像（不提交）
│   ├── .feishu-sync.json    ← manifest（docId↔文件映射、hash、revision）
│   └── 飞书深诺文档集合/
│       ├── 技术分享.md
│       └── 飞书深诺技术文档/
│           ├── BSP接口转发方案-v5.1.md
│           └── ...
├── api/                     ← 核心模块
│   ├── feishu.js            ← 飞书 API 基础封装
│   ├── remote-download.js   ← 远程读取与下载边界
│   ├── remote-delete.js     ← 远程删除边界
│   ├── move-transaction.js  ← identity 移动事务与状态机
│   ├── feishu-md.js         ← Markdown ↔ 飞书块双向转换
│   ├── helpers.js           ← 工具函数（路径/sanitize/manifest 读写）
│   └── merge.js             ← 冲突合并逻辑
├── scripts/                 ← 脚本
│   ├── auth.js              ← OAuth 认证 + token 自动续期
│   ├── sync.js              ← 同步主进程（WebSocket + poll + fs.watch）
│   ├── watchdog.js          ← 进程监督（崩溃自动重启）
│   ├── upload.js            ← 单文件上传到飞书
│   ├── download.js          ← 单文件从飞书下载
│   ├── update.js            ← 全量同步逻辑
│   ├── fetch.js             ← 拉取文档元数据
│   ├── list.js              ← 列出 wiki 空间树
│   ├── convert.js           ← Markdown ↔ 飞书 JSON 转换
│   └── cleanup-stubs.mjs    ← 幽灵副本清理工具
├── index.js                 ← start/stop 入口
├── package.json
├── _autostart_watchdog.cmd  ← Windows 开机自启
├── _autostart_watchdog.sh   ← Linux/macOS 开机自启
└── feishu-sync-watchdog.service  ← systemd 用户服务
```

## 幽灵副本防护

FeishuSync 有**四重守卫**防止重复文件：

| 守卫 | 触发条件 | 行为 |
|---|---|---|
| 守卫 1（标题级）| wiki 文档标题已被 manifest 中其他 docId 跟踪 | 跳过下载 |
| 守卫 2（manifest 路径）| wiki 文档标题在 manifest 有任何条目 | 跳过新建 |
| 守卫 3（wiki 树去重）| wiki 树中已有同名文档（`findExistingDocByTitle`）| 复用现有 docId |
| 守卫 4（文件系统）| wikid/ 子目录已有同名 .md 文件 | 跳过新建 |

**自动路径映射**：新发现的 wiki 文档 → 用 `buildWikiPathMap()` 查到父容器路径 → 自动放到正确子目录（不再堆积根目录）。

**清理残留文件：**

```bash
# 预览要清理的文件（不实际删除）
node scripts/cleanup-stubs.mjs --dry-run

# 实际清理
node scripts/cleanup-stubs.mjs
```

安全措施：只删除 500 字节以下的 stub 文件、要求同名基文件存在、严格匹配 `import-[a-z0-9]{4,}.md` 格式。

## Token 管理

**自动续期：** auth 进程每 84 分钟用 `refresh_token` 续期，写入 `user-token.txt`。sync 进程通过 `setTokenReloader` 机制自动读取最新 token。

**refresh_token 过期（约 30 天一次）：**
- auth 自动打开浏览器引导重新授权
- 授权链接同时写入 `feishu-auth-url.txt`
- 授权成功后自动删除该文件
- 5 分钟超时，超时后 60 秒重试

**手动重新授权：**

```bash
npm run auth
# 或查看 feishu-auth-url.txt 获取授权链接
```

## 故障排查

### 查看日志

```bash
tail logs/sync.log     # 同步状态
tail logs/auth.log     # auth 状态
tail logs/watchdog.log # watchdog 状态
```

### 常见问题

| 问题 | 解决 |
|---|---|
| sync.log 报 `99991677` | token 过期，等 auth 自动续期或 `npm run auth` |
| 浏览器弹出授权页面 | refresh_token 过期（约 30 天一次），点授权即可 |
| 出现 `-N` 后缀文件 | 运行 `node scripts/cleanup-stubs.mjs --dry-run` 检查 |
| sync 崩溃 | watchdog 会自动重启，检查 `logs/watchdog.log` |
| 文件在根目录不在子目录 | sync 已自动映射路径（`buildWikiPathMap`），自动放到对应子目录 |
| 表格上传报 1770001 | 空单元格问题，已修复（空格占位）|
| 图片不显示 | 检查 `drive:drive` 权限是否开通 |

## 备份与恢复

**本地备份：** `wikid/` 目录就是本地镜像，直接复制即可。

**恢复：**
1. 从备份复制文件到 `wikid/`
2. 用备份的 `.feishu-sync.json` 替换当前 manifest
3. 重启 sync → 自动重建映射

**软删除恢复：**
1. 从 `.feishu-sync-soft-trash/` 找回文件
2. 复制到原位置
3. 下一次 sync → 自动取消 pendingDelete

**飞书侧恢复：** 删除的文档在飞书回收站保留 30 天。

## License

MIT
