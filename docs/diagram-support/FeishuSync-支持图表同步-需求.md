# FeishuSync 支持图表同步 — 需求文档

## 背景

FeishuSync 是本地 Markdown ↔ 飞书 Wiki 双向同步工具。原实现中 ```mermaid``` 代码块被识别为普通 fenced code block，推到飞书后只显示代码文本内容（无图表可视化）。

工作区 `D:\workspace\meetbot-commons\src\main\resources\docs\` 下有 **50+ 个文档**使用 mermaid 描述流程/架构/调用关系，原方案完全无法让团队成员在飞书侧看到图表。

## 当前实现状态（Batch 1，2026-09-05）

#### 方案选定：官方 import_task API（**md → docx**）

放弃自实现的 PNG 渲染路径（mermaid → PNG → image block），改用飞书官方 `/drive/v1/import_tasks` API。

**原因**：

| 维度 | 官方 import_task | 自实现 PNG → image |
|---|---|---|
| 代码量 | < 100 行 | 600+ 行 |
| mermaid 位置 | 原位 | 末尾堆叠 |
| 飞书侧可编辑 | ✓（取决于 app 权限）| ✗（PNG）|
| 支持图类型 | 取决于飞书解析器 | 仅 mermaid 子集 |

#### 当前实际行为

- ✓ 通过 `import_task.create` 把 markdown 整篇导入为 docx
- ✓ 飞书自动解析：标题、列表、代码块、表格等
- ✓ 普通 markdown 块类型保留
- ⚠️ **mermaid 当前降级为代码块（block_type=14）**
- ⚠️ 文档标题来自 `file_name` 字段（默认 `import-{timestamp}.md`），需用户在飞书侧手动重命名

#### mermaid → 画板未启用的根因

飞书 API 上 mermaid → 画板的能力需要：

1. **app 开通 board / 插件能力**（大多数企业租户默认开通，但个人开发者账号可能受限）
2. 或**手动构造 `block_type=40` 插件块**（`component_type_id=blk_631fefbbae02400430b8f9f4`）——这要求走 block-by-block 路径而非 import_task

端到端测试结果（2026-09-05）：即使最简单的 mermaid `A --> B` 也被飞书识别为 block_type=14，说明**当前 app 账号未开通 mermaid 解析能力**。

## 功能维度分解

### 维度 1：上行（本地 Markdown → 飞书 Wiki）

| 功能点 | 条件/约束 | 依据来源 | 当前实现 |
|--------|-----------|----------|----------|
| **F1.1** import_task 整篇导入 | 调用 `/drive/v1/import_tasks` | openclaw/openclaw#16592 | ✅ Batch 1 |
| **F1.2** 临时 docx 作 parent_node | 飞书要求 `docx_file` 类型 parent_node 真实存在 | openclaw 实现 | ✅ Batch 1 |
| **F1.3** 临时 docx + file 清理 | finally 块删 tempDoc + file_token | openclaw 实现 | ✅ Batch 1 |
| **F1.4** addDocToWiki 挂载 | import 后把 docx 移到 wiki space | 官方 API | ✅ Batch 1 |
| **F1.5** 同步轮询任务状态 | job_status=0 视为成功 | lark-cli 参考 | ✅ Batch 1 |
| **F1.6** mermaid 渲染为画板 | block_type=40 插件块构造 | feishu-doc-writer SKILL | ❌ 当前降级为代码块，需后续 |
| **F1.7** 文档标题 | 当前固定 `import-{timestamp}.md` | import_task 限制 | ❌ 用户需手动改名 |

### 维度 2：下行（飞书 Wiki → 本地 Markdown）

| 功能点 | 条件/约束 | 依据来源 | 当前实现 |
|--------|-----------|----------|----------|
| **F2.1** rawContent 反向解析 | `downloadDocumentToFile` 已有 | 现有代码 | ✅ 未改动 |
| **F2.2** 普通块保留 | heading/text/code/list/table 等 | 现有代码 | ✅ 未改动 |
| **F2.3** diagram/board/iframe 反向 | 飞书绘制块结构复杂 | 未 |

### 维度 3：错误处理

| 功能点 | 条件/约束 | 当前实现 |
|--------|-----------|----------|
| **F3.1** 解析失败降级 | import_task 失败 → 抛错让调用方决定 | ✅ |
| **F3.2** 临时文件清理 | finally 块 best-effort | ✅ |
| **F3.3** addDocToWiki 失败 | 警告但不中断 import | ✅ |

## 范围与边界

### v1 支持的 markdown 元素

- ✅ 标题（heading1-9）
- ✅ 段落（text）
- ✅ 有序/无序列表（bullet/ordered）
- ✅ 普通代码块（block_type=14，不含 mermaid 解析）
- ✅ 引用（quote）
- ✅ 表格（markdown/HTML，自动拆分超9行）
- ✅ 链接、粗体、斜体、行内代码等文本样式
- ✅ 任务列表（todo）
- ⚠️ mermaid → **降级为代码块**，需手动方案 B

### 不支持

- 飞书 diagram 块的双向同步（反向解析太复杂，留给 Batch 2）
- 文档标题由 file_name 字段决定（不是 markdown H1），需用户手动改

## 验收标准

| 编号 | 标准 | 当前状态 |
|------|------|----------|
| AC1 | 本地 markdown → 飞书：标题、列表、代码、表格保留原位 | ✅ |
| AC2 | 普通代码块（含 mermaid source）保留为飞书 code block | ✅ |
| AC3 | mermaid 在飞书侧被识别为可视化画板 | ❌ 当前降级为代码块 |
| AC4 | 端到端不产生临时垃圾文件（wiki 侧栏只有目标文档） | ✅ |
| AC5 | import_task 失败时上传 token 不会泄露临时文件残留 | ✅ |

## 实施分批（已完成）

| 批次 | 内容 | 状态 |
|------|------|------|
| **Batch 1** | import_task 整篇导入（md → docx） | ✅ 已 commit |
| **Batch 2** | mermaid → block_type=40 插件块（如（手动构造）） | 待 mvp 开通 board 后启用 |

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 飞书 app 没开通 mermaid 解析 | 当前降级为代码块可用；用户可手动编辑 mermaid 成画板 |
| 文档标题是 import-{ts}.md | 用户在飞书侧手动改名（无 API 支持） |
| import_task 10 次轮询超时 | 当前限制是 20 秒；扩展可通过调大 maxAttempts |