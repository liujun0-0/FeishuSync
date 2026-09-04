# FeishuSync 支持图表同步 — 需求文档

## 背景

FeishuSync 是本地 Markdown ↔ 飞书 Wiki 双向同步工具。当前实现中 ` ```mermaid ` 代码块会被识别为普通 fenced code block（block_type=14）推到飞书，但飞书侧只显示为带反引号的纯文本块——**图表内容完全无法阅读**。

下游（飞书 → 本地）方向，飞书侧 `diagram` block（block_type=24，包含流程图、思维导图、关系图等）走 `renderBlock` 的 default 分支被静默丢弃——**飞书侧创建的图表同步回本地后丢失**。

工作区 `D:\workspace\meetbot-commons\src\main\resources\docs\` 下有 **50+ 个文档**使用 mermaid 描述流程/架构/调用关系，当前无法同步到飞书 wiki 给团队查阅。

## 功能维度分解

### 维度 1：上行（本地 Markdown → 飞书 Wiki）

| 功能点 | 条件/约束 | 依据来源 | 说明 |
|--------|-----------|----------|------|
| **F1.1** 识别本地 mermaid 代码块 | fenced code block 语言标签为 `mermaid` | 用户对话 | 已有 fenced code 解析，需扩展分支 |
| **F1.2** A 方案：渲染为飞书 diagram block | block_type=24；可编辑；优先路径 | 用户对话 | 需 mermaid→飞书 record JSON 转换器 |
| **F1.3** B 方案：降级为飞书 image block | block_type=27；只读不可编辑 | 用户对话 | A 失败时使用；需 mermaid→PNG→飞书上传 |
| **F1.4** 非 mermaid 代码块不变 | 仍走现有 code block 处理 | 用户对话 | 不能影响现有普通代码块同步 |

### 维度 2：下行（飞书 Wiki → 本地 Markdown）

| 功能点 | 条件/约束 | 依据来源 | 说明 |
|--------|-----------|----------|------|
| **F2.1** 识别飞书 diagram block | block_type=24，含 `diagram.record` 字段 | 飞书 OpenAPI 文档 | 走新增的 `renderDiagram` 分支 |
| **F2.2** A 方案：转回 mermaid 代码块 | 输出 ```` ```mermaid\n...\n``` ```` 包裹 | 用户对话 | 需飞书 record→mermaid 转换器 |
| **F2.3** B 方案保留为 .png 引用 | 输出 `![diagram](file_token)` 形态 | 用户对话 | A 转换失败时使用 |
| **F2.4** 现有 image block 处理不变 | block_type=27 走现有 `renderImage` | 用户对话 | 不影响普通图片 |

### 维度 3：双向冲突保护

| 功能点 | 条件/约束 | 依据来源 | 说明 |
|--------|-----------|----------|------|
| **F3.1** 本地 mermaid → 飞书 diagram 语义等价 | 同一图重排/重写不应触发冲突 | 用户对话 | AST 节点集+边集相同视为等价 |
| **F3.2** 解析失败时不影响其他块 | 单个 mermaid 失败不能中断整个文档同步 | 用户对话 | try/catch 包裹，失败降级到原样保留 |
| **F3.3** 转换结果写 manifest 时与现有 hash 策略一致 | file hash = 转换后 markdown 内容 SHA256 | 现有代码 | 不改 manifest 机制 |

### 维度 4：工具链与依赖

| 功能点 | 条件/约束 | 依据来源 | 说明 |
|--------|-----------|----------|------|
| **F4.1** mermaid 语法解析 | Node.js 端可用；支持 flowchart/mindmap 子集 | 用户对话 | 使用 `mermaid` npm 包或自写简化解析器 |
| **F4.2** mermaid → PNG 渲染 | 无头浏览器或 CLI；输出 PNG buffer | 用户对话 | 推荐 `@mermaid-js/mermaid-cli`（mmdc） |
| **F4.3** PNG 上传到飞书 | 调用 `drive.media.upload_all`；获取 file_token | SDK 已有 | 不新增 SDK 依赖 |

## 范围与边界

### 支持的 mermaid 图类型（v1 范围）

| 类型 | 支持情况 | 说明 |
|---|---|---|
| `flowchart TD/LR/BT/RL` | ✅ 完整支持 | 主要用例 |
| `mindmap` | ✅ 基础支持 | 二级层级，样式降级 |
| `sequenceDiagram` | ❌ 不支持 | 复杂时序图，表达差异大 |
| `erDiagram` | ❌ 不支持（v1） | 可后续扩展 |
| `classDiagram` | ❌ 不支持 | 同上 |
| `gantt` | ❌ 不支持 | 同上 |

### 不支持的能力

- 飞书 diagram block 的样式/颜色/字体映射（仅保留结构）
- 双向同步的"可视化差异对比"（用户自行 diff）
- mermaid 子图（subgraph）复杂样式保留

## 验收标准

| 编号 | 标准 |
|---|---|
| AC1 | 本地 markdown 含 ```` ```mermaid ```` 块 → 推送到飞书后，**5 秒内**在飞书 wiki 中显示为可查看的图表（image 或 diagram） |
| AC2 | 飞书侧创建/修改 diagram block → sync 拉取后，本地 markdown 中出现对应的 ```` ```mermaid ```` 代码块 |
| AC3 | A 转换失败 → 自动降级到 B 方案，**不抛出未捕获异常** |
| AC4 | round-trip（本地→飞书→本地）后节点集和边集一致（不含样式/坐标） |
| AC5 | 现有非 mermaid 文档同步行为**完全不变**（回归测试通过） |

## 实施分批（建议）

| 批次 | 内容 | 工作量 | 验收 |
|---|---|---|---|
| **Batch 1** | **B 方案全量**（F1.1+F1.3+F1.4+F2.3+F3.2+F3.3+F4.2+F4.3） | 1-2 小时 | AC1（image 形态）+ AC3 + AC5 |
| **Batch 2** | **A 方案上行**（F1.2 + F2.1+F2.2 + F4.1） | 1-2 天 | AC1（diagram 形态）+ AC2（部分）|
| **Batch 3** | **冲突保护**（F3.1）+ round-trip 完整测试 | 0.5 天 | AC4 |

> ⚠️ **每批次独立 commit**，可单独发布回滚。Batch 1 完成即可解决"图能同步"的核心痛点。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| 飞书 diagram record 字段格式未公开 | 通过抓包 web 端创建流程图的网络请求逆向；参考开源仓库 issue |
| mermaid 解析器（npm `mermaid`）在 Node 端有 DOM 依赖 | 使用 `mermaid` 包的 parser 模块单独调用，或自写子集解析器 |
| Playwright/Chrome 渲染 mermaid 性能 | 渲染走子进程 + 缓存（同一 mermaid hash 直接复用 PNG） |
| 双向同步语义不等价导致的循环推送 | 节点+边集合排序后 SHA256 比对，相等则视为一致 |
