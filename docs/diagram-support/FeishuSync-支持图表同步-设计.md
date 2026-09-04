# FeishuSync 支持图表同步 — 设计文档

## 一、目标与边界

实现本地 Markdown 中的 ` ```mermaid ` 代码块与飞书 Wiki 中的 diagram / image block 的双向同步。

### 范围

- **上行**：本地 mermaid → 飞书 diagram（可编辑） → 失败降级 → 飞书 image
- **下行**：飞书 diagram → 本地 mermaid → 失败降级 → 本地 image 引用

### 不在范围

- 飞书 diagram 的样式/颜色/字体映射
- mermaid 子图（subgraph）的复杂样式保留
- 实时协同编辑冲突解决

---

## 二、架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                         feishu-md.js                            │
│  (现有) markdownToFeishu()  →  feishuToMarkdown()                │
│           ↓ 扩展                  ↓ 扩展                          │
│  ┌─────────────────────┐    ┌──────────────────────────┐         │
│  │ mermaid fence 分支 │    │ diagram block 渲染分支   │         │
│  └─────────┬───────────┘    └────────────┬─────────────┘         │
│            ↓                            ↓                       │
│  ┌─────────────────────┐    ┌──────────────────────────┐         │
│  │ mermaid-to-feishu   │    │ feishu-diagram-to-md    │         │
│  │ (新)                │    │ (新)                    │         │
│  └─────┬───────┬───────┘    └────────┬─────────────────┘         │
│        ↓       ↓                    ↓                           │
│   ┌────────┐ ┌────────┐       ┌──────────────┐                  │
│   │diagram │ │image   │       │ mermaid      │                  │
│   │record  │ │PNG buf │       │ code fence   │                  │
│   │  (A)   │ │ (B降级)│       │ (下行)       │                  │
│   └────────┘ └────┬───┘       └──────────────┘                  │
│                   ↓                                             │
│             ┌──────────────┐                                    │
│             │ feishu       │                                    │
│             │ .uploadImage │                                    │
│             │ (新)         │                                    │
│             └──────────────┘                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、新增/修改的文件清单

| 文件 | 类型 | 行数预估 | 说明 |
|---|---|---|---|
| `api/feishu-md.js` | 修改 | +120 行 | 扩展 markdownToFeishu 和 feishuToMarkdown；BLOCK_TYPE 加 diagram |
| `api/feishu.js` | 修改 | +60 行 | 新增 uploadImage() helper |
| `api/mermaid-parser.js` | 新增 | ~150 行 | mermaid → AST（A 方案核心） |
| `api/mermaid-to-diagram.js` | 新增 | ~250 行 | mermaid AST → 飞书 diagram record JSON |
| `api/feishu-diagram-to-mermaid.js` | 新增 | ~150 行 | 飞书 record → mermaid 源码 |
| `api/mermaid-render.js` | 新增 | ~80 行 | mermaid → PNG buffer（B 方案） |
| `tests/diagram.test.mjs` | 新增 | ~200 行 | round-trip + 单向转换测试 |
| `docs/diagram-support/*` | 新增 | — | 需求 + 设计 + 自测 |
| `package.json` | 修改 | +5 行 | 加 `@mermaid-js/mermaid-cli` 等依赖 |
| `README.md` | 修改 | +30 行 | 更新支持的图表类型说明 |

**总计：~1040 行新代码 + ~200 行测试**

---

## 四、核心数据结构

### 4.1 mermaid AST（中间表示）

```ts
// api/mermaid-parser.js
type MermaidNode = {
  id: string;           // 节点唯一 id
  label: string;        // 节点显示文本（去掉方括号）
  shape: 'rect' | 'round' | 'circle' | 'rhombus' | 'stadium';
  parent?: string;      // 仅 mindmap 用
};

type MermaidEdge = {
  from: string;
  to: string;
  label?: string;
  arrow: 'normal' | 'dotted' | 'thick' | 'open' | 'cross';
};

type MermaidDiagram = {
  type: 'flowchart' | 'mindmap';
  direction?: 'TD' | 'LR' | 'BT' | 'RL';
  nodes: MermaidNode[];
  edges: MermaidEdge[];
  raw: string;          // 原始 mermaid 源码（用于错误恢复）
};
```

### 4.2 飞书 diagram record（逆向自飞书 web 端）

```ts
// api/mermaid-to-diagram.js
type FeishuDiagramRecord = {
  // 飞书内部结构（待抓包确认后填充）
  // 推测结构（基于 drawio 风格）：
  nodes: Array<{
    id: string;
    text: string;
    shape: string;       // 'rectangle' | 'round' | 'ellipse' | 'rhombus' | ...
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    label?: string;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    arrowEnd: 'classic' | 'none' | 'open';
  }>;
};
```

> ⚠️ 飞书 diagram record 真实结构需通过抓包确认，本设计的字段是推测起点。

### 4.3 转换错误处理

```ts
type ConversionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; fallback: 'image' | 'passthrough' };
```

---

## 五、关键算法

### 5.1 mermaid → 飞书 diagram record

**输入**：` ```mermaid\nflowchart LR\n  A --> B\n``` `

**步骤**：

1. **解析**：`mermaid-parser.js` 把源码转为 `MermaidDiagram` AST
2. **布局计算**：自写简单布局算法（拓扑排序 + 自动布局）
   - flowchart：每层一行，水平间距 200px，垂直间距 80px
   - mindmap：树形径向布局，根节点在中心
3. **形状映射**：
   | mermaid 语法 | 飞书 diagram shape |
   |---|---|
   | `A[text]` | `rectangle` |
   | `A(text)` | `round` |
   | `A((text))` | `ellipse` |
   | `A{text}` | `rhombus` |
   | `A([text])` | `stadium` |
4. **边映射**：
   | mermaid | 飞书 |
   |---|---|
   | `A --> B` | solid + classic |
   | `A -.-> B` | dashed + classic |
   | `A ==> B` | solid + classic (thick) |
   | `A -->|label| B` | 带 label 的边 |
5. **生成 record JSON** → 包装成飞书 block

**复杂度**：O(N + E)，N 节点数，E 边数

### 5.2 飞书 diagram record → mermaid

**反向步骤**：

1. 解析飞书 `diagram.record` JSON
2. 推断 diagram 类型（flowchart vs mindmap）：通过节点坐标分布
3. 输出 mermaid 源码：
   ```
   flowchart LR
     A[text] --> B[text]
   ```

### 5.3 冲突保护（语义等价判断）

```js
function semanticHash(diagram) {
  const nodes = diagram.nodes
    .map(n => `${n.id}:${n.label}:${n.shape}`)
    .sort()
    .join('|');
  const edges = diagram.edges
    .map(e => `${e.from}->${e.to}:${e.label || ''}`)
    .sort()
    .join('|');
  return sha256(nodes + '#' + edges);
}
```

下游拉取到 diagram 后转 mermaid → 算 semanticHash → 与上次 manifest 的 semanticHash 比较 → 相等则不推送。

### 5.4 失败降级链

```
尝试 A (mermaid → diagram)
  ├─ 解析失败 → 尝试 B
  ├─ 飞书 API 拒绝 diagram → 尝试 B
  └─ 网络超时 → 尝试 B

尝试 B (mermaid → PNG → image)
  ├─ mermaid-cli 不存在 → 保留为原 ```mermaid``` 代码块（B 失败）
  └─ 图片上传失败 → 保留为原 ```mermaid``` 代码块（B 失败）

B 失败也不抛错：保留原样同步，不影响其他 block
```

---

## 六、API 与接口

### 6.1 `api/mermaid-parser.js`

```js
/**
 * 解析 mermaid 源码为 AST
 * @param {string} source - mermaid 源码
 * @returns {ConversionResult<MermaidDiagram>}
 */
export function parseMermaid(source): ConversionResult<MermaidDiagram>;
```

### 6.2 `api/mermaid-to-diagram.js`

```js
/**
 * 将 mermaid AST 转为飞书 diagram record JSON
 * @param {MermaidDiagram} ast
 * @returns {ConversionResult<FeishuDiagramRecord>}
 */
export function mermaidToFeishuDiagram(ast): ConversionResult<FeishuDiagramRecord>;
```

### 6.3 `api/feishu-diagram-to-mermaid.js`

```js
/**
 * 将飞书 diagram record JSON 转回 mermaid 源码
 * @param {FeishuDiagramRecord} record
 * @returns {ConversionResult<string>}
 */
export function feishuDiagramToMermaid(record): ConversionResult<string>;
```

### 6.4 `api/mermaid-render.js`

```js
/**
 * 将 mermaid 源码渲染为 PNG buffer
 * @param {string} source - mermaid 源码
 * @param {object} options - { width, height, theme }
 * @returns {Promise<Buffer>}
 */
export async function renderMermaidToPng(source, options): Promise<Buffer>;
```

### 6.5 `api/feishu.js` 新增

```js
/**
 * 上传图片到飞书 drive，返回 file_token
 * @param {Buffer} buffer - PNG buffer
 * @param {string} fileName
 * @returns {Promise<string>} file_token
 */
export async function uploadImage(buffer, fileName): Promise<string>;
```

### 6.6 `api/feishu-md.js` 修改

`markdownToFeishu` 内 fenced code block 处理扩展：

```js
if (trimmed.startsWith('```')) {
  const lang = trimmed.slice(3).trim().toLowerCase();
  const codeText = ...;
  
  if (lang === 'mermaid') {
    // 尝试 A 方案
    const ast = parseMermaid(codeText);
    if (ast.ok) {
      const diagram = mermaidToFeishuDiagram(ast.value);
      if (diagram.ok) {
        blocks.push({
          block_type: BLOCK_TYPE.diagram,  // 新增
          diagram: { record: JSON.stringify(diagram.value) }
        });
        continue;
      }
    }
    // 降级到 B 方案
    try {
      const png = await renderMermaidToPng(codeText);
      const fileToken = await uploadImage(png, `${Date.now()}.png`);
      blocks.push({
        block_type: BLOCK_TYPE.image,
        image: { token: fileToken }
      });
    } catch (err) {
      // 全部失败：保留原 ```mermaid``` 代码块
      blocks.push(createCodeBlock(codeText));
    }
    continue;
  }
  
  // 非 mermaid 代码块走原有逻辑
  blocks.push(createCodeBlock(codeText));
}
```

`feishuToMarkdown` 新增 diagram block 渲染：

```js
case BLOCK_TYPE.diagram: {
  const recordJson = block.diagram?.record;
  if (recordJson) {
    try {
      const record = JSON.parse(recordJson);
      const md = feishuDiagramToMermaid(record);
      if (md.ok) {
        lines.push('```mermaid');
        lines.push(md.value);
        lines.push('```');
        break;
      }
    } catch {}
  }
  // 降级：渲染为图片占位（PNG 文件名用时间戳）
  lines.push(`![diagram](${block.diagram?.fallbackToken || 'unknown'}.png)`);
  break;
}
```

---

## 七、依赖与配置

### 7.1 新增 npm 依赖

```json
{
  "dependencies": {
    "@mermaid-js/mermaid-cli": "^10.x",   // mermaid → PNG 渲染
    "mermaid": "^10.x"                     // mermaid parser
  }
}
```

### 7.2 配置文件扩展（可选）

`config.json` 新增：

```json
{
  "sync": {
    "diagram": {
      "enabled": true,                     // 主开关
      "preferDiagram": true,               // true=A 优先, false=B 优先
      "pngCacheDir": "./.feishu-diagram-cache",
      "theme": "default"                   // mermaid 主题
    }
  }
}
```

---

## 八、测试方案

### 8.1 单元测试（`tests/diagram.test.mjs`）

| 用例 | 验证 |
|---|---|
| `parse simple flowchart` | 解析 `A-->B` 输出 1 边 2 节点 |
| `parse flowchart with labels` | 解析 `A-->\|text\|B` 输出带 label 的边 |
| `parse mindmap basic` | 解析 mindmap 输出父子关系 |
| `mermaid → diagram round-trip` | flowchart 完整 round-trip 后节点/边一致 |
| `mermaid → png → image` | B 方案生成 PNG buffer 非空 |
| `feishu diagram → mermaid` | 下行转换输出合法 mermaid 语法 |
| `invalid mermaid` | 解析失败返回 ok:false |
| `unsupported diagram type` | gantt/sequence 返回 ok:false（v1 不支持） |
| `semanticHash equal` | 同一图不同排版 → hash 相同 |
| `semanticHash different` | 加一个节点 → hash 不同 |

### 8.2 集成测试

拿 wikid 里 `非群发场景发送-Flow-支持数据回收(团队版).md` 这类无 mermaid 的文档，跑：

1. `npm run download <doc-id>` → 验证产物不变
2. 跑含 mermaid 的文档 → 验证飞书侧出现 diagram / image block

### 8.3 端到端测试

1. 修改一个含 mermaid 的本地文档
2. `npm run update` 触发同步
3. 飞书侧打开文档 → 看到图表
4. 在飞书侧修改图表
5. sync 拉取 → 本地 markdown 的 mermaid 代码块更新
6. 往返后无意外冲突

---

## 九、回滚策略

每个 Batch 独立 commit，可单独 revert：

| Batch | Commit | 回滚命令 |
|---|---|---|
| Batch 1（B 方案） | `feat: mermaid → PNG image fallback` | `git revert <hash>` |
| Batch 2（A 方案上行） | `feat: mermaid → feishu diagram block` | `git revert <hash>` |
| Batch 3（双向 + 冲突） | `feat: bidirectional diagram sync` | `git revert <hash>` |

Batch 1 完成即可解决"图能同步"的核心痛点，即使 Batch 2/3 延期也不影响。

---

## 十、风险与待确认

| # | 风险 | 待确认 |
|---|---|---|
| R1 | 飞书 diagram record 真实 JSON 结构未知 | 需要抓包飞书 web 端验证 |
| R2 | mermaid 解析库（npm `mermaid`）在 Node 端需要 jsdom | 可能需引入 `jsdom` 依赖 |
| R3 | mermaid-cli 需要 Chrome 依赖（puppeteer） | 用户机器是否已有 Chrome |
| R4 | 飞书 SDK 的 `drive.media.upload_all` 是否需要 parent_node 等额外参数 | 读 SDK 文档确认 |

---

## 十一、关键设计决策

| 决策 | 选项 | 选择 | 理由 |
|---|---|---|---|
| 是否在 `BLOCK_TYPE` 加 diagram | 加 / 不加 | **加** | 飞书侧确实存在该类型，不加会有漏判 |
| 失败降级优先级 | A→B / B→A | **A→B** | A 可编辑是核心价值，B 仅兜底 |
| 是否缓存 PNG | 是 / 否 | **是** | 同一 mermaid 内容幂等，避免重复渲染 |
| PNG 缓存 key | hash / path | **hash** | 不依赖本地路径，迁移友好 |
| 双向同步语义等价比较 | 字符串 / AST hash | **AST hash** | 避免"换行差异导致反复同步" |
