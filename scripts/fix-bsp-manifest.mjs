// 修复 BSP 报告 manifest 路径 + 清理残留 import-mt* 条目
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const WIKID = 'wikid';
const MANIFEST = path.join(WIKID, '.feishu-sync.json');

const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
const before = Object.keys(m.docs).length;

// 1. 删所有 import-mtvugpg1 条目
const toRemove = Object.keys(m.docs).filter(k => {
  const f = m.docs[k]?.file || '';
  return f.includes('import-mtvugpg1') || f.includes('import-mtv');
});
console.log(`删除 ${toRemove.length} 个 import-mt* 条目`);
for (const k of toRemove) delete m.docs[k];

// 2. 找 BSP 文件实际路径并加入 manifest
const BSP_DIR = path.join(WIKID, '飞书深诺文档集合', '飞书深诺技术文档', 'WhatsApp-BSP-API开放评估');
const BSP_FILE = path.join(BSP_DIR, 'WhatsApp-BSP-API开放现状评估报告.md');
const bspRel = '飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md';
const bspExists = await fs.access(BSP_FILE).then(() => true).catch(() => false);

if (bspExists) {
  const content = await fs.readFile(BSP_FILE, 'utf8');
  const hash = createHash('sha256').update(content).digest('hex');
  m.docs['BSP_RESTORED'] = {
    file: bspRel,
    revisionId: 0,
    title: 'WhatsApp Cloud API BSP 开放现状评估报告',
    fileType: 'docx',
    hash,
  };
  console.log(`BSP 已加入 manifest (hash: ${hash.slice(0, 12)})`);
} else {
  console.log('BSP 文件不存在:', BSP_FILE);
}

// 3. 同时删 pendingDelete 条目
const pendingRemove = Object.keys(m.docs).filter(k => m.docs[k].pendingDeleteAt);
for (const k of pendingRemove) { delete m.docs[k]; }
console.log(`删除 ${pendingRemove.length} 个 pendingDelete 条目`);

m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log(`manifest: ${before} → ${Object.keys(m.docs).length} 条目`);
