// 保留每个类别最新版本，删除其他 68 个 import-mt* 文件
// 安全措施：
// 1. 先列出要删除的文件（dry-run 模式）
// 2. 删除前先备份到 .feishu-sync-soft-trash/
// 3. 删除时同时删飞书侧文档
// 4. 更新 manifest
import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, fetchAllBlocks, deleteRemoteDocument } from '../api/feishu.js';

const ROOT = process.cwd();
const WIKID = path.join(ROOT, 'wikid');
const MANIFEST = path.join(WIKID, '.feishu-sync.json');
const TRASH_DIR = path.join(WIKID, '.feishu-sync-soft-trash');

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));

// 读 manifest
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));

// 找 import-mt* 文件
const importEntries = Object.entries(m.docs).filter(([_, e]) => {
  const fname = path.basename(e.file || '');
  return /^import-/.test(fname);
});

console.log(`=== 找到 ${importEntries.length} 个 import-mt* 条目 ===\n`);

// 按内容分类（用首行标题判断）
const categories = new Map(); // 首行标题 → [{docId, file, size, mtime, blocks}]

for (const [docId, entry] of importEntries) {
  const fullPath = path.join(WIKID, entry.file);
  let stat;
  try {
    stat = await fs.stat(fullPath);
  } catch {
    console.log(`  跳过（文件不存在）: ${entry.file}`);
    continue;
  }

  // 读文件首行判断内容类型
  const content = await fs.readFile(fullPath, 'utf8');
  const firstLine = content.split('\n')[0] || '';

  // 找到真实 H1（跳过 import-xxx 开头）
  let realTitle = firstLine;
  if (/^import-/.test(realTitle) || realTitle === '# Untitled') {
    // 真实 H1 在第二或第三行
    const lines = content.split('\n');
    for (let i = 1; i < Math.min(10, lines.length); i++) {
      if (lines[i].startsWith('# ') && !lines[i].startsWith('# import-')) {
        realTitle = lines[i];
        break;
      }
    }
  }

  // 用内容主题作为分类 key
  let category;
  if (/客户营销属性管理/.test(content)) category = '客户营销属性管理';
  else if (/WhatsApp Direct Send 接入技术方案/.test(content)) category = 'WhatsApp Direct Send 接入技术方案';
  else if (/WhatsApp Cloud API BSP 开放现状评估报告/.test(content)) category = 'WhatsApp Cloud API BSP 开放现状评估报告';
  else if (/Untitled/.test(firstLine) && !content.includes('# ')) category = 'Untitled 占位';
  else category = realTitle.slice(0, 30);

  if (!categories.has(category)) categories.set(category, []);
  categories.get(category).push({
    docId,
    file: entry.file,
    size: stat.size,
    mtime: stat.mtime,
    title: entry.title,
    firstLine,
    fullTitle: realTitle,
  });
}

console.log('=== 分类结果 ===');
for (const [cat, files] of categories) {
  console.log(`\n【${cat}】${files.length} 个`);
  // 按 size 降序排列（最大 = 最新版本）
  files.sort((a, b) => b.size - a.size);
  const keep = files[0]; // 保留最大的（最新版本）
  const toDelete = files.slice(1);

  console.log(`  保留: ${keep.size}B ${keep.title} (${keep.file})`);
  if (toDelete.length > 0) {
    console.log(`  删除 ${toDelete.length} 个:`);
    for (const f of toDelete) {
      console.log(`    ${f.size}B ${f.title} (${f.file})`);
    }
  }
}

// 询问确认后删除
console.log('\n=== 执行删除 ===');
await fs.mkdir(TRASH_DIR, { recursive: true });
let deleted = 0;

for (const [cat, files] of categories) {
  files.sort((a, b) => b.size - a.size);
  const keep = files[0];
  const toDelete = files.slice(1);

  for (const f of toDelete) {
    // 1. 移到 soft-trash 备份
    const trashName = path.basename(f.file).replace(/\.md\.md$/, '.md');
    try {
      await fs.rename(path.join(WIKID, f.file), path.join(TRASH_DIR, trashName));
      console.log(`  备份到 trash: ${trashName}`);
    } catch (err) {
      console.log(`  备份失败 ${f.file}: ${err.message.slice(0, 40)}`);
      continue;
    }

    // 2. 删飞书侧文档
    try {
      await deleteRemoteDocument(f.docId, token, 'docx');
      console.log(`  删飞书: ${f.title.slice(0, 40)} (${f.docId.slice(0, 10)})`);
    } catch (err) {
      console.log(`  飞书删失败: ${err.message.slice(0, 60)}`);
    }

    // 3. 从 manifest 删除
    delete m.docs[f.docId];
    deleted++;
  }
}

// 写回 manifest
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log(`\n完成: 删除 ${deleted} 个版本，保留 ${categories.size} 个最新版本`);
console.log(`manifest 条目: ${Object.keys(m.docs).length}`);
