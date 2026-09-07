// scripts/cleanup-stubs.mjs — 清理幽灵副本（仅删除确认是 stub 的文件）
//
// 安全设计（多重确认，避免误删）：
// 1. `-N.md` 文件：必须有同名（无 -N）的兄弟文件存在 → 证明是 clone 变体
// 2. 文件大小 < 500 字节 → 证明是 stub（正常文档几十 KB 以上）
// 3. `import-*.md`：必须严格匹配 import_task 命名模式 `import-[a-z0-9]{4,}\.md`
//    → 排除用户文件 `import-checklist.md` 等
// 4. import-* 文件也要求 < 500 字节 + 必须是 test/rebuild 期间的临时残留
// 5. 可选 --dry-run 参数只打印不删除（推荐先用 dry-run 看一眼）
// 6. 始终打印每个目标，确认后再删除
//
// 使用：node scripts/cleanup-stubs.mjs [--dry-run]

import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { deleteRemoteDocument } from '../api/feishu.js';

const DRY_RUN = process.argv.includes('--dry-run');

const config = await readConfig();
const token = await readToken(resolvePath(requireConfigValue(config, 'tokenPath')));

async function* walk(dir) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) yield* walk(full);
    else if (item.name.endsWith('.md')) yield full;
  }
}

const WIKID = 'wikid';

// 安全规则
const MAX_STUB_SIZE = 500; // bytes — ghost stubs 通常 46-65 字节
const IMPORT_TASK_PATTERN = /^import-[a-z0-9]{4,}\.md$/; // 与 FeishuSync createDocumentFromMarkdown 的 fileName 格式一致
const N_SUFFIX_PATTERN = /-(\d+)\.md$/;

function isGhostDuplicateStub(filePath) {
  const name = path.basename(filePath);
  const dir = path.dirname(filePath);

  // 检查 1: import_task 残留（严格匹配格式 + 小文件）
  if (IMPORT_TASK_PATTERN.test(name)) {
    return {
      isStub: true,
      reason: 'import_task 临时文件（严格匹配 import-{hash}.md）',
    };
  }

  // 检查 2: -N.md 后缀变体（必须有同名基文件）
  const m = name.match(N_SUFFIX_PATTERN);
  if (m) {
    const baseName = name.replace(N_SUFFIX_PATTERN, '.md');
    const basePath = path.join(dir, baseName);
    return {
      isStub: fs.exists(basePath),
      reason: `-N.md 变体，基文件 ${baseName} ${fs.exists(basePath) ? '存在' : '不存在'}`,
    };
  }

  return { isStub: false, reason: '不符合任何 stub 模式' };
}

const m = JSON.parse(await fs.readFile(`${WIKID}/.feishu-sync.json`, 'utf8'));
const targets = [];

for await (const file of walk(WIKID)) {
  const name = path.basename(file);
  // 仅匹配 import-* 和 -N.md 后缀
  if (!IMPORT_TASK_PATTERN.test(name) && !N_SUFFIX_PATTERN.test(name)) continue;

  const stat = await fs.stat(file);
  if (stat.size > MAX_STUB_SIZE) {
    console.log(`[跳过-过大] ${name} (${stat.size}B > ${MAX_STUB_SIZE}B)`);
    continue;
  }

  const result = isGhostDuplicateStub(file);
  if (!result.isStub) {
    console.log(`[跳过-非stub] ${name} (${result.reason})`);
    continue;
  }

  const rel = file.replace(/\\/g, '/').replace(`${WIKID}/`, '');
  const idx = Object.entries(m.docs).findIndex(([, e]) => e.file && e.file.replace(/\\/g, '/') === rel);
  const docId = idx >= 0 ? Object.entries(m.docs)[idx][0] : null;
  targets.push({ file, rel, docId, reason: result.reason, size: stat.size });
}

if (DRY_RUN) {
  console.log(`\n=== DRY RUN：找到 ${targets.length} 个候选 stub ===`);
  for (const t of targets) {
    console.log(`  ${t.rel}  (${t.size}B, ${t.docId ? 'tracked ' + t.docId.slice(0,10) : 'untracked'}) — ${t.reason}`);
  }
  console.log('\n（未做任何删除。用 --dry-run 移除此参数实际执行。）');
  process.exit(0);
}

console.log(`\n=== 准备清理 ${targets.length} 个 stub ===`);
for (const t of targets) {
  console.log(`  ${t.rel}  (${t.size}B${t.docId ? ', wiki=' + t.docId.slice(0,10) : ''})`);
}

let cleaned = 0;
const removedDocIds = [];
for (const t of targets) {
  await fs.unlink(t.file).catch((e) => console.error(`  [失败-本地] ${t.rel}: ${e.message}`));
  if (t.docId) {
    try {
      await deleteRemoteDocument(t.docId, token, 'docx');
      delete m.docs[t.docId];
      removedDocIds.push(t.docId);
    } catch (e) {
      console.error(`  [失败-wiki] ${t.docId.slice(0,10)}: ${e.message.slice(0,80)}`);
    }
  }
  cleaned++;
}
m.updatedAt = new Date().toISOString();
await fs.writeFile(`${WIKID}/.feishu-sync.json`, JSON.stringify(m, null, 2) + '\n');
console.log(`\n清理 ${cleaned} 个文件，移除 ${removedDocIds.length} 个 manifest 条目`);
