import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const MANIFEST = 'wikid/.feishu-sync.json';
const BSP_FILE = 'wikid/飞书深诺文档集合/飞书深诺技术文档/WhatsApp-BSP-API开放评估/WhatsApp-BSP-API开放现状评估报告.md';
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
const content = await fs.readFile(BSP_FILE, 'utf8');
const hash = createHash('sha256').update(content).digest('hex');
if (m.docs['BSP_RESTORED']) {
  m.docs['BSP_RESTORED'].hash = hash;
  console.log('BSP hash 已更新:', hash.slice(0, 12));
}
for (const k of Object.keys(m.docs)) {
  const f = m.docs[k]?.file || '';
  if (k !== 'BSP_RESTORED' && (f.includes('BSP') || f.includes('import-mtv'))) {
    delete m.docs[k];
    console.log('删旧条目:', k);
  }
}
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log('manifest 已更新');
