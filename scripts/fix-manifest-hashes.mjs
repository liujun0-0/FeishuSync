// 更新 manifest：删除 soft-trash 条目、更新 BSP hash
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const WIKID = 'wikid';
const MANIFEST = path.join(WIKID, '.feishu-sync.json');
const BSP = 'wikid/飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md';

const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));

// 1. 删除所有 soft-trash 相关条目（这些不应该同步）
let removedTrash = 0;
for (const k of Object.keys(m.docs)) {
  const f = m.docs[k]?.file || '';
  const t = m.docs[k]?.title || '';
  if (f.includes('.feishu-sync-soft-trash') || t.includes('.feishu-sync-soft-trash')) {
    delete m.docs[k];
    removedTrash++;
  }
}
console.log(`删除 ${removedTrash} 个 soft-trash 条目`);

// 2. 删除所有 import-mtv* 条目（这些是重复的，已经跳过）
let removedImport = 0;
for (const k of Object.keys(m.docs)) {
  const f = m.docs[k]?.file || '';
  const t = m.docs[k]?.title || '';
  if (f.includes('import-mtv') || t.includes('import-mtv')) {
    delete m.docs[k];
    removedImport++;
  }
}
console.log(`删除 ${removedImport} 个 import-mtv* 条目`);

// 3. 更新 BSP hash
const content = await fs.readFile(BSP, 'utf8');
const hash = createHash('sha256').update(content).digest('hex');
const bspKey = Object.keys(m.docs).find(k => {
  const f = m.docs[k]?.file || '';
  return f.includes('WhatsApp-BSP-API开放现状评估报告');
});
if (bspKey) {
  m.docs[bspKey].hash = hash;
  console.log(`BSP hash 更新: ${hash.slice(0,12)}`);
}

// 保存
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log(`\nmanifest: ${Object.keys(m.docs).length} 条目`);
